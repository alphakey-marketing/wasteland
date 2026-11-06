extends Node3D

const ENCOUNTER = preload("res://data/encounter.tres")
const CameraRig = preload("res://scripts/camera_rig.gd")
const Overlay = preload("res://scripts/view/battle_overlay.gd")
var sim := BattleSim.new()
var navigation := BattleNavigation.new()
var camera_rig := CameraRig.new()
var gesture := BattleGesture.new()
var hud: BattleHUD
var overlay: Control
var selected: Array[int] = [0, 1, 2, 3]
var views: Dictionary = {}
var follow_id := -1
var shots: Array[Dictionary] = []
var hud_time := 0.0
var save_time := 0.0
var mouse_active := false
var reset_armed := ""
var capture_time := 0.0
var capture_done := false

func _ready() -> void:
	var environment := WorldEnvironment.new()
	environment.environment = Environment.new()
	environment.environment.background_mode = Environment.BG_COLOR
	environment.environment.background_color = Color("a6aa99")
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_color = Color("eee2c5")
	environment.environment.ambient_light_energy = 0.65
	add_child(environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_energy = 1.15
	add_child(sun)
	LabVisuals.part(self, Vector3(26, 0.1, 26), Vector3(0, -0.12, 0), Color("a29b78"))
	for x in range(-12, 13, 2):
		LabVisuals.part(self, Vector3(0.025, 0.01, 24), Vector3(x, -0.05, 0), Color("8e896c"))
	for z in range(-12, 13, 2):
		LabVisuals.part(self, Vector3(24, 0.01, 0.025), Vector3(0, -0.05, z), Color("8e896c"))
	add_child(navigation)
	camera_rig.external_controls = true
	camera_rig.pan_limit = 12
	add_child(camera_rig)
	camera_rig.camera.size = 18
	camera_rig.position = Vector3(-2, 0, 2)
	var canvas := CanvasLayer.new()
	add_child(canvas)
	overlay = Overlay.new()
	overlay.battle = self
	canvas.add_child(overlay)
	hud = preload("res://scenes/battle_hud.tscn").instantiate()
	canvas.add_child(hud)
	hud.action.connect(on_action)
	hud.portrait.connect(on_portrait)
	start_battle("--stress" in OS.get_cmdline_user_args())
	get_window().focus_exited.connect(func():
		gesture.cancel()
		mouse_active = false
		sim.paused = true
		save_game(false)
	)
	if "--smoke" in OS.get_cmdline_user_args():
		call_deferred("smoke")

func start_battle(stress := false) -> void:
	sim = BattleSim.new()
	sim.setup(ENCOUNTER, stress)
	selected.assign([0, 1, 2, 3])
	follow_id = -1
	gesture.cancel()
	shots.clear()
	rebuild_views()

func rebuild_views() -> void:
	for view in views.values():
		remove_child(view)
		view.queue_free()
	views.clear()
	navigation.bind_units(sim.units)
	for u in sim.units:
		var view := BattleUnitView.new()
		add_child(view)
		view.setup(u)
		views[u.id] = view
	hud.populate(sim.units)

func _physics_process(dt: float) -> void:
	if not navigation.ready_for_paths:
		return
	sim.occluded = navigation.occluded_pairs(sim.units)
	sim.tick(dt)
	navigation.advance(sim, dt)
	for event in sim.events:
		if event.ranged:
			var shot := event.duplicate()
			shot.age = 0.0
			shots.append(shot)

func _process(dt: float) -> void:
	gesture.advance(dt)
	for u in sim.units:
		views[u.id].refresh(u, u.id in selected, sim.paused, sim.speed)
	if follow_id >= 0:
		var u := sim.find_unit(follow_id)
		if u:
			camera_rig.position = camera_rig.position.lerp(u.position, minf(1, dt * 6))
	if not sim.paused:
		for shot in shots:
			shot.age += dt * sim.speed
	shots = shots.filter(func(s: Dictionary): return s.age < 0.22)
	overlay.queue_redraw()
	hud_time += dt
	if hud_time >= 0.1:
		hud.refresh(sim, selected, gesture.box_mode, follow_id)
		hud_time = 0
	save_time += dt
	if save_time > 30:
		save_game(false)
		save_time = 0
	if "--capture-battle" in OS.get_cmdline_user_args():
		capture_time += dt
		if capture_time > 3 and not capture_done:
			capture_done = true
			capture.call_deferred()

func _input(event: InputEvent) -> void:
	if (event is InputEventMouseButton or event is InputEventMouseMotion) and event.device == InputEvent.DEVICE_ID_EMULATION:
		return
	# Releases must be observed even over UI, but cannot issue world commands there.
	if event is InputEventScreenTouch and not event.pressed:
		finish_touch(event.index, event.position, event.canceled or over_ui(event.position))
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed and mouse_active:
		finish_touch(-1, event.position, over_ui(event.position))
		mouse_active = false

func _unhandled_input(event: InputEvent) -> void:
	if (event is InputEventMouseButton or event is InputEventMouseMotion) and event.device == InputEvent.DEVICE_ID_EMULATION:
		return
	if event is InputEventScreenTouch and event.pressed:
		gesture.press(event.index, event.position / 3)
	elif event is InputEventScreenDrag:
		move_touch(event.index, event.position)
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			mouse_active = true
			gesture.press(-1, event.position / 3)
		elif event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			camera_rig.camera.size = clampf(camera_rig.camera.size * (0.9 if event.button_index == MOUSE_BUTTON_WHEEL_UP else 1.1), 6, 30)
	elif event is InputEventMouseMotion and mouse_active:
		move_touch(-1, event.position)
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_SPACE:
			on_action("pause")
		elif event.keycode == KEY_A:
			on_action("all")

func over_ui(point: Vector2) -> bool:
	return point.y < 165 or point.y > get_viewport().get_visible_rect().size.y - 270 or (point.x > get_viewport().get_visible_rect().size.x - 490 and point.y > get_viewport().get_visible_rect().size.y - 565) or hud.menu.visible

func move_touch(id: int, point: Vector2) -> void:
	gesture.drag(id, point / 3)
	if gesture.mode == "pan":
		follow_id = -1
		camera_rig.pan(gesture.pan_delta * 3)
	elif gesture.mode == "pinch":
		follow_id = -1
		camera_rig.camera.size = clampf(camera_rig.camera.size * gesture.zoom_ratio, 6, 30)

func finish_touch(id: int, point: Vector2, cancelled: bool) -> void:
	var action := gesture.release(id, cancelled)
	if action == "tap":
		tap(point)
	elif action == "box":
		var rect := Rect2(gesture.start * 3, (gesture.current - gesture.start) * 3).abs()
		var found: Array[int] = []
		for u in sim.units:
			if u.team == 0 and not u.down and rect.has_point(camera_rig.camera.unproject_position(u.position + Vector3.UP)):
				found.append(u.id)
		if not found.is_empty():
			selected = found
		sim.notice = "框選咗 %d 個隊友" % found.size()

func tap(point: Vector2) -> void:
	var picked: UnitState = null
	var distance := 78.0
	for u in sim.units:
		if u.down:
			continue
		var p: Vector2 = camera_rig.camera.unproject_position(u.position + Vector3.UP)
		var d := point.distance_to(p)
		if d < distance:
			distance = d
			picked = u
	if picked:
		if picked.team == 0:
			selected.assign([picked.id])
		else:
			sim.issue(selected, "attack", Vector3.ZERO, picked.id)
		return
	var camera: Camera3D = camera_rig.camera
	var origin := camera.project_ray_origin(point)
	var direction := camera.project_ray_normal(point)
	var ground: Variant = Plane(Vector3.UP, 0).intersects_ray(origin, direction)
	if ground != null:
		sim.issue(selected, "move", ground)

func on_portrait(id: int, follow: bool) -> void:
	selected.assign([id])
	if follow:
		follow_id = id
		sim.notice = "鏡頭跟隨 · 拖動畫面解除"

func on_action(action: String) -> void:
	if action not in ["restart", "stress"]:
		reset_armed = ""
	match action:
		"menu":
			hud.menu.visible = not hud.menu.visible
			gesture.cancel()
		"pause":
			if sim.result.is_empty():
				sim.paused = not sim.paused
				sim.notice = "已暫停 · 點地面或敵人排隊" if sim.paused else "執行指令"
		"slow":
			sim.speed = 0.25 if sim.speed == 1 else 1.0
		"box":
			gesture.box_mode = not gesture.box_mode
		"all":
			selected.clear()
			for u in sim.units:
				if u.team == 0 and not u.down:
					selected.append(u.id)
		"auto": sim.auto_pause = hud.auto_button.button_pressed
		"save": save_game(true)
		"load": load_game()
		"restart", "stress":
			if reset_armed != action:
				reset_armed = action
				sim.notice = "再按一次確認重新開始；未存進度會消失"
				return
			start_battle(action == "stress")
			reset_armed = ""
			hud.menu.hide()

func save_game(manual: bool) -> void:
	var view := {"camera": [camera_rig.position.x, camera_rig.position.y, camera_rig.position.z], "zoom": camera_rig.camera.size, "selected": selected, "follow": follow_id}
	var error := BattleSave.write(sim, view)
	if manual or error != OK:
		sim.notice = "已存檔" if error == OK else "存檔失敗，請檢查儲存空間／瀏覽器權限"

func load_game() -> void:
	var data := BattleSave.read()
	if data.is_empty():
		sim.notice = "未有可用存檔，或存檔已損壞"
		return
	sim = BattleSave.restore(data)
	selected.clear()
	follow_id = -1
	var view: Variant = data.get("view", {})
	if view is Dictionary:
		if BattleSave.vector_valid(view.get("camera")):
			camera_rig.position = Vector3(view.camera[0], view.camera[1], view.camera[2])
		if view.get("zoom") is float or view.get("zoom") is int:
			camera_rig.camera.size = clampf(float(view.zoom), 6, 30)
		if view.get("selected") is Array:
			for id in view.selected:
				if (id is int or id is float) and sim.find_unit(int(id)) and sim.find_unit(int(id)).team == 0:
					selected.append(int(id))
		if (view.get("follow") is int or view.get("follow") is float) and sim.find_unit(int(view.follow)):
			follow_id = int(view.follow)
	gesture.cancel()
	shots.clear()
	rebuild_views()
	hud.menu.hide()
	sim.notice = "已讀檔"

func smoke() -> void:
	await get_tree().create_timer(1).timeout
	sim.auto_pause = false
	sim.issue(selected, "move", Vector3(-4, 0, -1))
	await get_tree().create_timer(2).timeout
	print("BATTLE SMOKE PASS: %d units, navigation ready=%s" % [sim.units.size(), navigation.ready_for_paths])
	get_tree().quit()

func capture() -> void:
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://qa/battle.png")
	print("BATTLE CAPTURE: draws=%d primitives=%d" % [Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)])
	get_tree().quit()
