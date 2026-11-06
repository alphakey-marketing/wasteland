extends GutTest

var nav: BattleNavigation
var sim: BattleSim

func before_each() -> void:
	nav = BattleNavigation.new()
	add_child_autofree(nav)
	sim = BattleSim.new()
	sim.setup(preload("res://data/encounter.tres"))
	sim.auto_pause = false
	for i in range(sim.units.size() - 1, 0, -1):
		sim.units.remove_at(i)
	# Keep an inactive opponent so the simulator doesn't finish the encounter.
	var enemy := UnitState.new(100, 1, preload("res://data/enemy.tres"), Vector3(10, 0, -10))
	sim.units.append(enemy)
	sim.units[0].position = Vector3(-4, 0, 0)
	nav.bind_units(sim.units)
	for i in 180:
		if nav.ready_for_paths:
			break
		await get_tree().physics_frame
	assert_true(nav.ready_for_paths, "navigation map initialized within three seconds")

func test_path_around_wall_and_physical_motion() -> void:
	sim.issue([0], "move", Vector3(4, 0, 0))
	var crossed_wall := false
	for i in 1000:
		sim.tick(1.0 / 60)
		nav.advance(sim, 1.0 / 60)
		var p := sim.units[0].position
		if absf(p.x) < 1.27 and absf(p.z) < 4.27:
			crossed_wall = true
		if p.distance_to(Vector3(4, 0, 0)) < 0.5:
			break
		await get_tree().physics_frame
	assert_false(crossed_wall, "capsule must never cross wall")
	assert_lt(sim.units[0].position.distance_to(Vector3(4, 0, 0)), 0.5, "arrives around wall")

func test_unreachable_target_and_pause_freeze() -> void:
	sim.issue([0], "move", Vector3(50, 0, 50))
	sim.tick(1.0 / 60)
	nav.advance(sim, 1.0 / 60)
	assert_true(sim.units[0].commands.is_empty())
	assert_eq(sim.units[0].status, "無法到達")
	sim.paused = true
	sim.issue([0], "move", Vector3(-4, 0, 8))
	var before := sim.units[0].position
	for i in 5:
		sim.tick(1.0 / 60)
		nav.advance(sim, 1.0 / 60)
		await get_tree().physics_frame
	assert_eq(sim.units[0].position, before)

func test_agents_pass_without_overlapping() -> void:
	var a := sim.units[0]
	var b := UnitState.new(1, 0, preload("res://data/white.tres"), Vector3(-3, 0, 7))
	a.position = Vector3(-7, 0, 7)
	sim.units.append(b)
	nav.bind_units(sim.units)
	await get_tree().physics_frame
	sim.issue([0], "move", Vector3(-3, 0, 7.1))
	sim.issue([1], "move", Vector3(-7, 0, 6.9))
	var closest := 10.0
	for i in 720:
		sim.tick(1.0 / 60)
		nav.advance(sim, 1.0 / 60)
		closest = minf(closest, a.position.distance_to(b.position))
		if a.commands.is_empty() and b.commands.is_empty():
			break
		await get_tree().physics_frame
	assert_gt(closest, 0.55, "avoidance keeps capsules apart")
	assert_lt(a.position.distance_to(Vector3(-3, 0, 7.1)), 0.5)
	assert_lt(b.position.distance_to(Vector3(-7, 0, 6.9)), 0.5)

func test_wall_blocks_ranged_line_of_sight() -> void:
	sim.units[0].position = Vector3(-1.5, 0, 0)
	sim.units[1].position = Vector3(1.5, 0, 0)
	var pairs := nav.occluded_pairs(sim.units)
	assert_true(pairs.has(Vector2i(0, 100)))
