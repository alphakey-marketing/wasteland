extends Node3D

var camera := Camera3D.new()
var fingers: Dictionary = {}

func _ready() -> void:
	add_child(camera)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 8.2
	camera.position = Vector3(-6, 8, 10)
	camera.look_at(Vector3.ZERO)
	camera.current = true

func pan(delta: Vector2) -> void:
	var scale_factor := camera.size / get_viewport().get_visible_rect().size.x
	var right := camera.global_basis.x
	var forward := Vector3(camera.global_basis.z.x, 0, camera.global_basis.z.z).normalized()
	position -= (right * delta.x + forward * delta.y) * scale_factor
	position.x = clampf(position.x, -5, 5)
	position.z = clampf(position.z, -5, 5)

func _input(event: InputEvent) -> void:
	# Always release fingers, even if a gesture ends over the UI.
	if event is InputEventScreenTouch and not event.pressed:
		fingers.erase(event.index)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed:
		fingers[event.index] = event.position
	elif event is InputEventScreenDrag and fingers.has(event.index):
		if fingers.size() == 2:
			var keys := fingers.keys()
			var old_distance: float = fingers[keys[0]].distance_to(fingers[keys[1]])
			fingers[event.index] = event.position
			var new_distance: float = fingers[keys[0]].distance_to(fingers[keys[1]])
			camera.size = clampf(camera.size * old_distance / maxf(new_distance, 1), 3.8, 11)
		else:
			pan(event.relative)
			fingers[event.index] = event.position
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		pan(event.relative)
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera.size = maxf(3.8, camera.size * 0.9)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera.size = minf(11, camera.size * 1.1)
