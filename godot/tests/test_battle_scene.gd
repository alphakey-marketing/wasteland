extends GutTest

var battle: Node3D

func before_each() -> void:
	for panel in get_tree().root.find_children("GutScene", "", true, false):
		panel.hide()
	battle = preload("res://scenes/battle.tscn").instantiate()
	add_child_autofree(battle)
	await get_tree().process_frame
	await get_tree().process_frame

func test_emulated_touch_button_does_not_order_world() -> void:
	# OS touch emulation happens before viewport dispatch. Headless push_input
	# bypasses that OS step, so supply its emulated mouse pair explicitly.
	var point: Vector2 = battle.hud.pause_button.get_global_rect().get_center()
	var motion := InputEventMouseMotion.new()
	motion.position = point
	motion.global_position = point
	get_viewport().push_input(motion, true)
	var press := InputEventMouseButton.new()
	press.device = InputEvent.DEVICE_ID_EMULATION
	press.button_index = MOUSE_BUTTON_LEFT
	press.position = point
	press.global_position = point
	press.pressed = true
	get_viewport().push_input(press, true)
	await get_tree().process_frame
	var release := InputEventMouseButton.new()
	release.device = InputEvent.DEVICE_ID_EMULATION
	release.button_index = MOUSE_BUTTON_LEFT
	release.position = point
	release.global_position = point
	release.pressed = false
	get_viewport().push_input(release, true)
	await get_tree().process_frame
	assert_true(battle.sim.paused, "touch activates actual pause button")
	assert_true(battle.sim.units[0].commands.is_empty(), "UI tap never issues world command")
	assert_eq(battle.gesture.mode, "idle")

func test_portrait_follow_and_drag_cancel() -> void:
	battle.on_portrait(2, true)
	assert_eq(battle.follow_id, 2)
	assert_eq(battle.selected, [2])
	battle.gesture.press(0, Vector2(100, 200))
	battle.move_touch(0, Vector2(360, 600))
	assert_eq(battle.follow_id, -1)
	assert_eq(battle.gesture.mode, "pan")

func test_stress_scene_and_eight_portrait_limit() -> void:
	battle.start_battle(true)
	await get_tree().process_frame
	assert_eq(battle.sim.units.size(), 20)
	assert_eq(battle.hud.cards.size(), 8)
	battle.on_action("all")
	assert_eq(battle.selected.size(), 10)

func test_save_load_rebuilds_scene_without_duplicate_actors() -> void:
	var path := "user://scene_test.json"
	battle.sim.paused = true
	var ids: Array[int] = [0]
	battle.sim.issue(ids, "move", Vector3(-3, 0, 5))
	assert_eq(BattleSave.write(battle.sim, {}, path), OK)
	battle.sim = BattleSave.restore(BattleSave.read(path))
	battle.rebuild_views()
	await get_tree().process_frame
	assert_eq(battle.views.size(), 8)
	assert_eq(battle.navigation.bodies.size(), 8)
	assert_eq(battle.sim.units[0].commands.size(), 1)
	DirAccess.remove_absolute(path)

func test_complete_battle_reaches_result() -> void:
	for i in 180:
		if battle.navigation.ready_for_paths:
			break
		await get_tree().physics_frame
	battle.sim.auto_pause = false
	var ids: Array[int] = [0, 1, 2, 3]
	var target := 100
	battle.sim.issue(ids, "attack", Vector3.ZERO, target)
	for i in 7200:
		if not battle.sim.result.is_empty():
			break
		# A player selects the next surviving opponent; idle allies only aggro
		# within encounter range, not across the entire map.
		if battle.sim.find_unit(target).down:
			for u in battle.sim.units:
				if u.team == 1 and not u.down:
					target = u.id
					battle.sim.issue(ids, "attack", Vector3.ZERO, target)
					break
		await get_tree().physics_frame
	assert_false(battle.sim.result.is_empty(), "one complete fight resolves within two simulated minutes")
	if battle.sim.result.is_empty():
		for u in battle.sim.units:
			print("FIGHT ", u.id, " ", u.position, " ", u.status, " ", u.health, " commands ", u.commands.size())
