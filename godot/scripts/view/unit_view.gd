class_name BattleUnitView
extends Node3D

var actor := LabActor.new()
var ring := MeshInstance3D.new()
var unit_id := 0

func setup(u: UnitState) -> void:
	unit_id = u.id
	add_child(actor)
	actor.equip(u.definition.weapon.visual)
	actor.equip(u.definition.armor.visual)
	var mesh := TorusMesh.new()
	mesh.inner_radius = 0.38
	mesh.outer_radius = 0.43
	mesh.rings = 12
	mesh.ring_segments = 6
	ring.mesh = mesh
	ring.position.y = 0.025
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.albedo_color = Color("e7b85b") if u.team == 0 else Color("d96852")
	ring.material_override = material
	add_child(ring)
	# Team shoulder tab uses the existing shared material cache.
	LabVisuals.part(actor.attachments["chest"], Vector3(0.52, 0.12, 0.31), Vector3(0, 0.12, 0), u.definition.tint)

func refresh(u: UnitState, selected: bool, frozen: bool, speed: float) -> void:
	position = u.position
	ring.visible = selected or u.team == 1
	actor.animation_speed = 0 if frozen else speed
	if u.down:
		actor.pose = "sleep"
		actor.rotation = Vector3(PI / 2, 0, 0)
		actor.position.y = 0.25
	else:
		actor.position.y = 0
		actor.rotation = Vector3(0, atan2(u.facing.x, u.facing.z), 0)
		actor.pose = ("shoot" if u.definition.weapon.reach > 2 else "attack") if u.attack_flash > 0 else ("walk" if u.wants_move else "idle")
