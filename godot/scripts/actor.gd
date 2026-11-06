class_name LabActor
extends Node3D

var skeleton := Skeleton3D.new()
var attachments: Dictionary = {}
var limb: Array[Node3D] = []
var gear_nodes: Dictionary = {}
var gear: Dictionary = {}
var left_state: String = "natural"
var pose: String = "walk"
var phase: float = 0.0
var carry_socket: Node3D
var animation_speed := 1.0

func _ready() -> void:
	add_child(skeleton)
	bone("hips", "", Vector3(0, 0.94, 0))
	bone("chest", "hips", Vector3(0, 0.40, 0))
	bone("head", "chest", Vector3(0, 0.44, 0))
	for side in ["left", "right"]:
		var sign_x: float = -1.0 if side == "left" else 1.0
		bone(side + "_upper_arm", "chest", Vector3(sign_x * 0.36, 0.17, 0))
		bone(side + "_forearm", side + "_upper_arm", Vector3(0, -0.32, 0))
		bone(side + "_hand", side + "_forearm", Vector3(0, -0.29, 0))
		bone(side + "_thigh", "hips", Vector3(sign_x * 0.17, -0.03, 0))
		bone(side + "_shin", side + "_thigh", Vector3(0, -0.43, 0))
		bone(side + "_foot", side + "_shin", Vector3(0, -0.38, 0))
	body("hips", Vector3(0.46, 0.22, 0.29), Vector3.ZERO, Color("51473a"))
	body("chest", Vector3(0.49, 0.48, 0.28), Vector3(0, -0.05, 0), Color("b19469"))
	body("head", Vector3(0.29, 0.34, 0.28), Vector3(0, 0.02, 0), Color("d4ac81"))
	# Face points toward +Z; a dark brow makes orientation legible.
	body("head", Vector3(0.24, 0.055, 0.035), Vector3(0, 0.06, 0.15), Color("433a33"))
	for side in ["left", "right"]:
		for spec in [["_upper_arm", Vector3(0.20, 0.30, 0.20), Vector3(0, -0.15, 0)], ["_forearm", Vector3(0.17, 0.27, 0.17), Vector3(0, -0.135, 0)], ["_hand", Vector3(0.18, 0.15, 0.17), Vector3(0, -0.055, 0)]]:
			var mesh := body(side + spec[0], spec[1], spec[2], Color("d4ac81"))
			if side == "left":
				limb.append(mesh)
		body(side + "_thigh", Vector3(0.23, 0.40, 0.25), Vector3(0, -0.20, 0), Color("6f7563"))
		body(side + "_shin", Vector3(0.19, 0.36, 0.21), Vector3(0, -0.18, 0), Color("6f7563"))
		body(side + "_foot", Vector3(0.23, 0.14, 0.36), Vector3(0, -0.025, 0.07), Color("433a33"))
	# Permanent shoulder cap closes the severed joint and overlaps the prosthetic cuff.
	body("left_upper_arm", Vector3(0.23, 0.09, 0.23), Vector3(0, -0.01, 0), Color("78664e"))
	carry_socket = Node3D.new()
	attachments["chest"].add_child(carry_socket)
	carry_socket.position = Vector3(0, -0.90, -0.48)

func bone(id: String, parent: String, origin: Vector3) -> void:
	var idx := skeleton.get_bone_count()
	skeleton.add_bone(id)
	if not parent.is_empty():
		skeleton.set_bone_parent(idx, skeleton.find_bone(parent))
	skeleton.set_bone_rest(idx, Transform3D(Basis.IDENTITY, origin))
	var attachment := BoneAttachment3D.new()
	skeleton.add_child(attachment)
	attachment.bone_name = id
	attachments[id] = attachment

func body(id: String, size: Vector3, offset: Vector3, color: Color) -> MeshInstance3D:
	return LabVisuals.part(attachments[id], size, offset, color)

func equip(item: GearDefinition) -> void:
	clear_slot(item.slot)
	gear[item.slot] = item
	var nodes: Array[Node3D] = []
	for spec in item.parts:
		nodes.append(LabVisuals.part(attachments[spec.bone], spec.size, spec.offset, spec.color, spec.get("shape", "box")))
	gear_nodes[item.slot] = nodes
	if item.slot == "prosthetic":
		left_state = "prosthetic"
		for mesh in limb:
			mesh.hide()

func clear_slot(slot: String) -> void:
	for mesh in gear_nodes.get(slot, []):
		mesh.get_parent().remove_child(mesh)
		mesh.queue_free()
	gear_nodes.erase(slot)
	gear.erase(slot)

func sever_left() -> void:
	clear_slot("prosthetic")
	left_state = "missing"
	for mesh in limb:
		mesh.hide()

func restore() -> void:
	clear_slot("prosthetic")
	left_state = "natural"
	for mesh in limb:
		mesh.show()
	pose = "walk"
	phase = 0

func rotate_bone(id: String, angles: Vector3) -> void:
	skeleton.set_bone_pose_rotation(skeleton.find_bone(id), Quaternion.from_euler(angles))

func _process(delta: float) -> void:
	phase += delta * 3.2 * animation_speed
	skeleton.reset_bone_poses()
	if pose == "sleep" or pose == "idle":
		return
	if pose == "attack" or pose == "shoot":
		rotate_bone("right_upper_arm", Vector3(-1.2 if pose == "shoot" else -0.9 + sin(phase * 4) * 0.7, 0, 0))
		rotate_bone("left_upper_arm", Vector3(-1.2 if pose == "shoot" else -0.2, 0, 0))
		return
	if pose == "carried":
		rotate_bone("chest", Vector3(0.2, 0, 0))
		for side in ["left", "right"]:
			rotate_bone(side + "_thigh", Vector3(-1.1, 0, -0.38 if side == "left" else 0.38))
			rotate_bone(side + "_shin", Vector3(1.3, 0, 0))
			rotate_bone(side + "_upper_arm", Vector3(-1.7, 0, 0))
			rotate_bone(side + "_forearm", Vector3(-0.5, 0, 0))
		return
	var swing := sin(phase) * 0.32
	rotate_bone("left_thigh", Vector3(swing, 0, 0))
	rotate_bone("right_thigh", Vector3(-swing, 0, 0))
	rotate_bone("left_shin", Vector3(maxf(0, -swing), 0, 0))
	rotate_bone("right_shin", Vector3(maxf(0, swing), 0, 0))
	rotate_bone("left_upper_arm", Vector3(-swing * 0.6, 0, -0.10))
	rotate_bone("right_upper_arm", Vector3(swing * 0.6, 0, 0.16))
	if pose == "carry":
		rotate_bone("chest", Vector3(0.16, 0, 0))
		rotate_bone("left_upper_arm", Vector3(0.6, 0, -0.22))
		rotate_bone("right_upper_arm", Vector3(0.6, 0, 0.22))
