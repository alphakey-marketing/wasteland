class_name LabVisuals
extends RefCounted

static var paint: Texture2D
static var materials: Dictionary = {}

static func material(color: Color) -> ShaderMaterial:
	if materials.has(color):
		return materials[color]
	if paint == null:
		paint = load("res://materials/paint.svg")
	var m := ShaderMaterial.new()
	m.shader = load("res://materials/toon.gdshader")
	m.set_shader_parameter("paint_texture", paint)
	m.set_shader_parameter("tint", color)
	var outline := ShaderMaterial.new()
	outline.shader = load("res://materials/outline.gdshader")
	m.next_pass = outline
	materials[color] = m
	return m

static func part(parent: Node3D, size: Vector3, offset: Vector3, color: Color, shape: String = "box") -> MeshInstance3D:
	var item := MeshInstance3D.new()
	if shape == "cylinder":
		var mesh := CylinderMesh.new()
		mesh.top_radius = size.x * 0.5
		mesh.bottom_radius = size.z * 0.5
		mesh.height = size.y
		mesh.radial_segments = 6
		mesh.rings = 1
		item.mesh = mesh
	else:
		var mesh := BoxMesh.new()
		mesh.size = size
		item.mesh = mesh
	item.material_override = material(color)
	parent.add_child(item)
	item.position = offset
	return item
