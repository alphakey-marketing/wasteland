extends GutTest

const ENCOUNTER = preload("res://data/encounter.tres")
var sim: BattleSim

func before_each() -> void:
	sim = BattleSim.new()
	sim.setup(ENCOUNTER)
	sim.auto_pause = false

func test_pause_queue_cap_replace_and_formation() -> void:
	sim.paused = true
	for i in 8:
		sim.issue([0, 1, 2, 3], "move", Vector3(i, 0, 0))
	assert_eq(sim.units[0].commands.size(), 6)
	assert_almost_eq(sim.units[0].commands[0].destination.x, 2.0 - 0.425, 0.001)
	assert_ne(sim.units[0].commands[0].destination, sim.units[1].commands[0].destination)
	sim.tick(1)
	assert_eq(sim.elapsed, 0.0)
	sim.paused = false
	sim.issue([0], "attack", Vector3.ZERO, 100)
	assert_eq(sim.units[0].commands.size(), 1)
	assert_eq(sim.units[0].commands[0].target_id, 100)

func test_quarter_speed_and_auto_pause_once() -> void:
	sim.speed = 0.25
	sim.tick(1)
	assert_eq(sim.elapsed, 0.25)
	sim.auto_pause = true
	sim.units[4].position = sim.units[0].position + Vector3.RIGHT
	sim.tick(1)
	assert_true(sim.paused)
	assert_true(sim.alerted)
	assert_eq(sim.elapsed, 0.25)
	sim.paused = false
	sim.tick(1)
	assert_false(sim.paused)
	assert_eq(sim.elapsed, 0.5)

func test_damage_cooldown_down_and_invalid_target() -> void:
	var attacker := sim.units[2]
	var target := sim.units[4]
	target.health[0] = 0.01
	target.health[1] = 0.01
	for i in 100:
		sim.attack(attacker, target)
		if target.down:
			break
	assert_true(target.down)
	assert_gt(attacker.cooldown, 0.0)
	assert_eq(target.commands.size(), 0)
	sim.issue([2], "attack", Vector3.ZERO, target.id)
	sim.tick(0.01)
	assert_eq(attacker.commands.size(), 0)
	assert_false(target.wants_move)

func test_limb_wounds_slow_movement() -> void:
	var u := sim.units[0]
	var healthy := u.move_speed()
	u.health[4] = 0
	assert_almost_eq(u.move_speed(), healthy * 0.25, 0.0001)
	assert_eq(u.maximum, [32.0, 70.0, 35.0, 35.0, 49.0])

func test_ranged_attack_works_at_bow_range() -> void:
	var archer := sim.units[3]
	var enemy := sim.units[4]
	enemy.position = archer.position + Vector3(3, 0, 0)
	sim.issue([3], "attack", Vector3.ZERO, enemy.id)
	sim.tick(0.016)
	assert_gt(archer.cooldown, 0.0)
	assert_false(archer.wants_move)
	assert_true(sim.events.any(func(e): return e.ranged))

func test_occluded_enemy_is_pursued_instead_of_shot_through_wall() -> void:
	var archer := sim.units[3]
	sim.units[4].position = archer.position + Vector3(3, 0, 0)
	sim.occluded[Vector2i(3, 100)] = true
	sim.issue([3], "attack", Vector3.ZERO, 100)
	sim.tick(0.016)
	assert_eq(archer.cooldown, 0.0)
	assert_true(archer.wants_move)

func test_save_roundtrip_preserves_commands_and_rng_continuation() -> void:
	sim.paused = true
	sim.issue([0, 3], "move", Vector3(2, 0, 4))
	sim.issue([0, 3], "attack", Vector3.ZERO, 100)
	sim.attack(sim.units[0], sim.units[4])
	var encoded: Dictionary = JSON.parse_string(JSON.stringify(sim.encode()))
	assert_true(BattleSave.valid(encoded))
	var restored := BattleSave.restore(encoded)
	assert_eq(JSON.stringify(restored.encode()), JSON.stringify(sim.encode()))
	sim.attack(sim.units[0], sim.units[4])
	restored.attack(restored.units[0], restored.units[4])
	assert_eq(restored.units[4].health, sim.units[4].health)
	assert_eq(restored.rng.state, sim.rng.state)

func test_file_roundtrip_and_corrupt_save() -> void:
	var path := "user://test_phase1.json"
	assert_eq(BattleSave.write(sim, {}, path), OK)
	assert_false(BattleSave.read(path).is_empty())
	assert_eq(BattleSave.write(sim, {}, path), OK, "replace existing save")
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string("{broken")
	file.close()
	assert_true(BattleSave.read(path).is_empty())
	DirAccess.remove_absolute(path)

func test_bad_save_rejected_without_resource_loading() -> void:
	var d := sim.encode()
	d.units[0].definition = "res://scripts/lab.gd"
	assert_false(BattleSave.valid(d))
	d = sim.encode()
	d.units[0].health = [1]
	assert_false(BattleSave.valid(d))
	d = sim.encode()
	d.units[1].id = d.units[0].id
	assert_false(BattleSave.valid(d))
	d = sim.encode()
	d.units[0].commands = [{"kind": "attack", "point": [0, 0, 0], "target": 999}]
	assert_false(BattleSave.valid(d))

func test_victory_and_down_units_cannot_receive_orders() -> void:
	for u in sim.units:
		if u.team == 1:
			u.down = true
	sim.units[0].down = true
	sim.issue([0], "move", Vector3.ZERO)
	assert_true(sim.units[0].commands.is_empty())
	sim.tick(0.016)
	assert_true(sim.paused)
	assert_true(sim.result.begins_with("勝利"))
