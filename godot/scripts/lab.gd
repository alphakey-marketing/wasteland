extends Node3D

const ARMOR = [preload("res://equipment/cloth.tres"), preload("res://equipment/leather.tres"), preload("res://equipment/plate.tres")]
const WEAPONS = [preload("res://equipment/knife.tres"), preload("res://equipment/machete.tres"), preload("res://equipment/axe.tres")]
const PROSTHETICS = [preload("res://equipment/scrap.tres"), preload("res://equipment/military.tres")]
var a := LabActor.new()
var b := LabActor.new()
var bed_socket := Node3D.new()
var camera_rig: Node3D
var armor_index := 0
var weapon_index := 0
var prosthetic_index := -1
var status := Label.new()
var stats := Label.new()
var elapsed := 0.0
var buttons: Array[Button] = []

func _ready() -> void:
	RenderingServer.set_default_clear_color(Color("b6afa0"))
	var env := WorldEnvironment.new()
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.background_color = Color("b6afa0")
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color.WHITE
	env.environment.ambient_light_energy = 0.45
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-45, -35, 0)
	sun.light_energy = 1.1
	add_child(sun)
	LabVisuals.part(self, Vector3(14, 0.12, 14), Vector3(0, -0.15, 0), Color("aaa58a"))
	for x in range(-4, 5):
		LabVisuals.part(self, Vector3(0.025, 0.015, 9), Vector3(x, -0.08, 0), Color("8f8c76"))
	add_child(a)
	add_child(b)
	a.name = "ActorA"
	b.name = "ActorB"
	var bed := Node3D.new()
	add_child(bed)
	bed.position = Vector3(1.8, 0, -1.3)
	LabVisuals.part(bed, Vector3(1.2, 0.18, 2.3), Vector3(0, 0.45, 0), Color("5a5143"))
	LabVisuals.part(bed, Vector3(1.12, 0.16, 2.15), Vector3(0, 0.62, 0), Color("b5b190"))
	LabVisuals.part(bed, Vector3(0.8, 0.12, 0.38), Vector3(0, 0.74, -0.78), Color("e5ddbf"))
	for x in [-0.46, 0.46]:
		for z in [-0.9, 0.9]:
			LabVisuals.part(bed, Vector3(0.13, 0.45, 0.13), Vector3(x, 0.2, z), Color("514638"))
	bed.add_child(bed_socket)
	bed_socket.position = Vector3(0, 0.90, 0.95)
	bed_socket.rotation_degrees.x = -90
	camera_rig = Node3D.new()
	camera_rig.set_script(load("res://scripts/camera_rig.gd"))
	add_child(camera_rig)
	camera_rig.position = Vector3(0, -0.1, 0)
	build_ui()
	reset()
	if "--verify" in OS.get_cmdline_user_args():
		call_deferred("verify")
	if "--capture" in OS.get_cmdline_user_args():
		call_deferred("capture")

func build_ui() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)
	var root := Control.new()
	canvas.add_child(root)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var theme := Theme.new()
	theme.default_font_size = 42
	root.theme = theme
	var heading := Label.new()
	root.add_child(heading)
	heading.position = Vector2(40, 40)
	heading.add_theme_font_size_override("font_size", 34)
	heading.text = "荒原 · 分件驗證場\nA：左側換裝　B：右側同伴\n拖動平移 · 雙指縮放"
	heading.add_theme_color_override("font_color", Color("292b27"))
	root.add_child(stats)
	stats.position = Vector2(40, 175)
	stats.add_theme_font_size_override("font_size", 30)
	stats.add_theme_color_override("font_color", Color("292b27"))
	var panel := PanelContainer.new()
	root.add_child(panel)
	panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_top = -770
	panel.offset_bottom = -30
	panel.offset_left = 25
	panel.offset_right = -25
	var box := VBoxContainer.new()
	panel.add_child(box)
	box.add_theme_constant_override("separation", 12)
	box.add_child(status)
	status.custom_minimum_size.y = 78
	status.add_theme_font_size_override("font_size", 34)
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 14)
	grid.add_theme_constant_override("v_separation", 14)
	box.add_child(grid)
	var labels := ["換甲", "換刀", "斷左手", "裝義肢", "A 揹起 B", "放 B 上床", "重置"]
	var actions: Array[Callable] = [cycle_armor, cycle_weapon, sever, cycle_prosthetic, carry, put_to_bed, reset]
	for i in labels.size():
		var button := Button.new()
		button.text = labels[i]
		button.custom_minimum_size = Vector2(490, 144)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(actions[i])
		grid.add_child(button)
		buttons.append(button)

func refresh() -> void:
	var arm := "原生左手" if a.left_state == "natural" else "左手缺失"
	if a.left_state == "prosthetic":
		arm = a.gear["prosthetic"].label
	status.text = "A：%s · %s · %s\nB：%s" % [ARMOR[armor_index].label, WEAPONS[weapon_index].label, arm, {"walk": "待機", "carried": "被揹住", "sleep": "瞓床"}.get(b.pose, b.pose)]
	buttons[3].disabled = a.left_state == "natural"
	buttons[4].disabled = b.pose == "carried"
	buttons[5].disabled = b.pose != "carried"

func cycle_armor() -> void:
	armor_index = (armor_index + 1) % ARMOR.size()
	a.equip(ARMOR[armor_index])
	refresh()

func cycle_weapon() -> void:
	weapon_index = (weapon_index + 1) % WEAPONS.size()
	a.equip(WEAPONS[weapon_index])
	refresh()

func sever() -> void:
	a.sever_left()
	prosthetic_index = -1
	refresh()

func cycle_prosthetic() -> void:
	if a.left_state == "natural":
		return
	prosthetic_index = (prosthetic_index + 1) % PROSTHETICS.size()
	a.equip(PROSTHETICS[prosthetic_index])
	refresh()

func carry() -> void:
	b.reparent(a.carry_socket, false)
	b.transform = Transform3D.IDENTITY
	b.pose = "carried"
	a.pose = "carry"
	refresh()

func put_to_bed() -> void:
	if b.pose != "carried":
		return
	b.reparent(bed_socket, false)
	b.transform = Transform3D.IDENTITY
	b.pose = "sleep"
	a.pose = "walk"
	refresh()

func reset() -> void:
	b.reparent(self, false)
	a.transform = Transform3D.IDENTITY
	b.transform = Transform3D.IDENTITY
	a.position = Vector3(-1.05, 0, 0.3)
	b.position = Vector3(0.7, 0, 0.5)
	a.restore()
	b.restore()
	armor_index = 0
	weapon_index = 0
	prosthetic_index = -1
	elapsed = 0
	a.equip(ARMOR[0])
	a.equip(WEAPONS[0])
	b.equip(ARMOR[1])
	camera_rig.position = Vector3(0, -0.1, 0)
	camera_rig.camera.size = 8.2
	refresh()

func _process(delta: float) -> void:
	elapsed += delta
	a.position.x = -1.05 + sin(elapsed * 0.7) * 0.38
	stats.text = "%d FPS · draws %d · rendered primitives %d" % [Engine.get_frames_per_second(), Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)]

func verify() -> void:
	for item in ARMOR + WEAPONS + PROSTHETICS:
		for spec in item.parts:
			assert(a.skeleton.find_bone(spec.bone) >= 0)
	var camera = camera_rig.camera
	var original_size: float = camera.size
	for index in 2:
		var touch := InputEventScreenTouch.new()
		touch.index = index
		touch.position = Vector2(100 + 100 * index, 300)
		touch.pressed = true
		camera_rig._unhandled_input(touch)
	var drag := InputEventScreenDrag.new()
	drag.index = 1
	drag.position = Vector2(300, 300)
	camera_rig._unhandled_input(drag)
	assert(camera.size < original_size)
	for index in 2:
		var release := InputEventScreenTouch.new()
		release.index = index
		camera_rig._input(release)
	assert(camera_rig.fingers.is_empty())
	for i in 3:
		cycle_armor()
		cycle_weapon()
		sever()
		assert(a.left_state == "missing")
		for mesh in a.limb:
			assert(not mesh.visible)
		cycle_prosthetic()
		cycle_prosthetic()
		assert(a.gear["prosthetic"] == PROSTHETICS[1])
		carry()
		assert(b.get_parent() == a.carry_socket)
		await get_tree().process_frame
		put_to_bed()
		assert(b.get_parent() == bed_socket and b.pose == "sleep")
		reset()
		assert(b.get_parent() == self and a.left_state == "natural")
		for mesh in a.limb:
			assert(mesh.visible)
	print("VERIFY PASS: gear, limb, carry, bed, reset")
	get_tree().quit()

func geometry_count(node: Node) -> int:
	var total := 0
	if node is MeshInstance3D and node.is_visible_in_tree():
		for surface in node.mesh.get_surface_count():
			var arrays: Array = node.mesh.surface_get_arrays(surface)
			var indices: PackedInt32Array = arrays[Mesh.ARRAY_INDEX]
			total += indices.size() / 3
	for child in node.get_children():
		total += geometry_count(child)
	return total

func snapshot(id: String) -> void:
	for frame in 12:
		await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://qa/%s.png" % id)
	print("METRICS %s: mesh_triangles=%d draw_calls=%d rendered_primitives=%d" % [id, geometry_count(self), Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)])

func capture() -> void:
	await snapshot("01_default")
	cycle_armor()
	cycle_weapon()
	sever()
	await snapshot("02_missing")
	cycle_prosthetic()
	await snapshot("03_scrap")
	cycle_armor()
	cycle_weapon()
	cycle_prosthetic()
	await snapshot("04_military")
	carry()
	await snapshot("05_carry")
	put_to_bed()
	await snapshot("06_bed")
	reset()
	await snapshot("07_reset")
	get_tree().quit()
