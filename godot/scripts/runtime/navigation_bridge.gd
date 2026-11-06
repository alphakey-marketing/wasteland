class_name BattleNavigation
extends Node3D

const WALLS := [Rect2(-1, -4, 2, 8), Rect2(4, 2, 4, 2), Rect2(-8, -6, 3, 2)]
var region := NavigationRegion3D.new()
var bodies: Dictionary = {}
var agents: Dictionary = {}
var safe_velocities: Dictionary = {}
var last_goals: Dictionary = {}
var stuck: Dictionary = {}
var ready_for_paths := false

func _ready() -> void:
	var mesh := NavigationMesh.new()
	mesh.cell_size = 0.25
	mesh.agent_radius = 0.4
	var vertices := PackedVector3Array()
	for z in range(-12, 13):
		for x in range(-12, 13):
			vertices.append(Vector3(x, 0, z))
	mesh.vertices = vertices
	for z in 24:
		for x in 24:
			var center := Vector2(x - 11.5, z - 11.5)
			var obstructed := false
			for wall in WALLS:
				if wall.grow(0.9).has_point(center):
					obstructed = true
			if not obstructed:
				var index := z * 25 + x
				mesh.add_polygon(PackedInt32Array([index, index + 25, index + 26, index + 1]))
	region.navigation_mesh = mesh
	add_child(region)
	for wall in WALLS:
		add_wall(Vector3(wall.position.x + wall.size.x / 2, 0.8, wall.position.y + wall.size.y / 2), Vector3(wall.size.x, 1.6, wall.size.y))
	for spec in [[Vector3(-12.5, 0.8, 0), Vector3(1, 1.6, 26)], [Vector3(12.5, 0.8, 0), Vector3(1, 1.6, 26)], [Vector3(0, 0.8, -12.5), Vector3(24, 1.6, 1)], [Vector3(0, 0.8, 12.5), Vector3(24, 1.6, 1)]]:
		add_wall(spec[0], spec[1])
	# Region mesh processing and map iteration updates are asynchronous.
	# Fixed frame counts race on cold startup and slower mobile devices.
	while NavigationServer3D.map_get_iteration_id(region.get_navigation_map()) == 0:
		await get_tree().physics_frame
	while NavigationServer3D.map_get_closest_point_owner(region.get_navigation_map(), Vector3(-10, 0, -10)) != region.get_rid():
		await get_tree().physics_frame
	ready_for_paths = true

func add_wall(point: Vector3, size: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = point
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	body.add_child(shape)
	add_child(body)
	LabVisuals.part(body, size, Vector3.ZERO, Color("77705b"))

func bind_units(units: Array[UnitState]) -> void:
	for old in bodies.values():
		remove_child(old)
		old.queue_free()
	bodies.clear()
	agents.clear()
	safe_velocities.clear()
	last_goals.clear()
	stuck.clear()
	for u in units:
		var body := CharacterBody3D.new()
		body.position = u.position
		body.motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
		body.collision_layer = 2
		body.collision_mask = 1
		var shape := CollisionShape3D.new()
		var capsule := CapsuleShape3D.new()
		capsule.radius = 0.28
		capsule.height = 1.7
		shape.shape = capsule
		shape.position.y = 0.85
		body.add_child(shape)
		var agent := NavigationAgent3D.new()
		agent.radius = 0.4
		agent.height = 1.8
		agent.neighbor_distance = 3
		agent.max_neighbors = 8
		agent.path_desired_distance = 0.25
		agent.target_desired_distance = 0.25
		agent.avoidance_enabled = true
		agent.velocity_computed.connect(func(v: Vector3): safe_velocities[u.id] = v)
		body.add_child(agent)
		add_child(body)
		bodies[u.id] = body
		agents[u.id] = agent
		safe_velocities[u.id] = Vector3.ZERO
		stuck[u.id] = 0.0

func advance(sim: BattleSim, dt: float) -> void:
	if not ready_for_paths:
		return
	for u in sim.units:
		var body: CharacterBody3D = bodies[u.id]
		var agent: NavigationAgent3D = agents[u.id]
		# Downed actors are visuals, not upright avoidance obstacles. Keeping
		# their radius active can seal a narrow approach after the first kills.
		agent.avoidance_enabled = not u.down
		if sim.paused or u.down or not u.wants_move:
			agent.velocity = Vector3.ZERO
			safe_velocities[u.id] = Vector3.ZERO
			stuck[u.id] = 0.0
			continue
		var goal := NavigationServer3D.map_get_closest_point(region.get_navigation_map(), u.destination)
		if goal.distance_to(u.destination) > 1.25:
			sim.blocked(u)
			continue
		if not last_goals.has(u.id) or last_goals[u.id].distance_to(goal) > 0.25:
			agent.target_position = goal
			last_goals[u.id] = goal
			stuck[u.id] = 0.0
		var next := agent.get_next_path_position()
		if agent.is_navigation_finished():
			if u.position.distance_to(u.destination) > 0.5:
				sim.blocked(u)
			else:
				u.wants_move = false
				if not u.commands.is_empty() and u.commands[0].kind == "move":
					u.commands.pop_front()
			continue
		var desired := (next - body.position).normalized() * u.move_speed() * sim.speed
		agent.max_speed = u.move_speed() * sim.speed
		agent.velocity = desired
		var velocity: Vector3 = safe_velocities[u.id]
		# Cap displacement near path corners and targets; collision is the final guard.
		velocity = velocity.limit_length(minf(agent.max_speed, body.position.distance_to(next) / dt))
		velocity.y = 0
		var before := body.position
		body.velocity = velocity
		body.move_and_slide()
		body.position.y = 0
		u.position = body.position
		var moved := before.distance_to(u.position)
		if moved > 0.002:
			u.facing = (u.position - before).normalized()
			stuck[u.id] = 0.0
		else:
			stuck[u.id] += dt * sim.speed
		if stuck[u.id] > 5:
			sim.blocked(u)
			last_goals.erase(u.id)

func path_for(id: int) -> PackedVector3Array:
	return agents[id].get_current_navigation_path() if agents.has(id) else PackedVector3Array()

func occluded_pairs(units: Array[UnitState]) -> Dictionary:
	var blocked: Dictionary = {}
	for i in units.size():
		for j in range(i + 1, units.size()):
			var a := units[i]
			var b := units[j]
			if a.team == b.team or a.down or b.down or a.position.distance_to(b.position) > 4:
				continue
			var ray := PhysicsRayQueryParameters3D.create(a.position + Vector3.UP, b.position + Vector3.UP, 1)
			if not get_world_3d().direct_space_state.intersect_ray(ray).is_empty():
				blocked[Vector2i(a.id, b.id)] = true
				blocked[Vector2i(b.id, a.id)] = true
	return blocked
