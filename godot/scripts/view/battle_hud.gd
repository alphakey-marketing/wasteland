class_name BattleHUD
extends Control

signal action(name: String)
signal portrait(id: int, follow: bool)
var status := Label.new()
var notice := Label.new()
var portraits := HBoxContainer.new()
var cards: Dictionary = {}
var pause_button: Button
var slow_button: Button
var select_button: Button
var auto_button: CheckButton
var menu := VBoxContainer.new()
var last_portrait := -1
var last_portrait_time := -1.0
var touch_origin := Vector2.ZERO
var touch_moved := false

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var skin := Theme.new()
	skin.default_font = preload("res://fonts/NotoSansTC-subset.ttf")
	skin.default_font_size = 38
	for type in ["Button", "CheckButton", "PanelContainer"]:
		for state in ["normal", "panel", "hover", "pressed"]:
			var box := StyleBoxFlat.new()
			box.bg_color = Color("514536") if state == "pressed" else Color("252a29")
			box.border_color = Color("a18a59")
			box.set_border_width_all(2)
			box.set_corner_radius_all(16)
			box.content_margin_left = 18
			box.content_margin_right = 18
			box.content_margin_top = 12
			box.content_margin_bottom = 12
			skin.set_stylebox(state, type, box)
	theme = skin
	var top := HBoxContainer.new()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = 24
	top.offset_right = -24
	top.offset_top = 30
	add_child(top)
	status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status.add_theme_color_override("font_color", Color("f2d492"))
	top.add_child(status)
	var options := make_button("☰ 選單", "menu", top)
	options.custom_minimum_size.x = 200
	notice.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	notice.offset_top = 175
	notice.offset_left = 28
	notice.offset_right = -28
	notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	notice.add_theme_font_size_override("font_size", 34)
	notice.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(notice)
	var panel := PanelContainer.new()
	panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_top = -255
	panel.offset_bottom = -24
	panel.offset_left = 18
	panel.offset_right = -18
	add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = false
	scroll.scroll_deadzone = 10
	panel.add_child(scroll)
	portraits.add_theme_constant_override("separation", 12)
	scroll.add_child(portraits)
	var commands := GridContainer.new()
	commands.columns = 2
	commands.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	commands.offset_left = -474
	commands.offset_top = -555
	commands.offset_right = -24
	commands.offset_bottom = -285
	add_child(commands)
	make_button("全選", "all", commands)
	select_button = make_button("框選", "box", commands)
	slow_button = make_button("¼ 慢鏡", "slow", commands)
	pause_button = make_button("Ⅱ 暫停", "pause", commands)
	menu.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	menu.offset_left = -510
	menu.offset_right = -24
	menu.offset_top = 170
	add_child(menu)
	make_button("存檔", "save", menu)
	make_button("讀檔", "load", menu)
	auto_button = CheckButton.new()
	auto_button.text = "遇敵自動暫停"
	auto_button.button_pressed = true
	auto_button.custom_minimum_size.y = 144
	auto_button.toggled.connect(func(_v): action.emit("auto"))
	menu.add_child(auto_button)
	make_button("重新開始", "restart", menu)
	make_button("10 對 10 測試", "stress", menu)
	menu.hide()
	get_viewport().size_changed.connect(apply_safe_area)
	apply_safe_area()

func apply_safe_area() -> void:
	if DisplayServer.get_name() == "headless":
		return
	var safe := DisplayServer.get_display_safe_area()
	var screen := DisplayServer.screen_get_size()
	if screen.y <= 0 or not OS.has_feature("mobile"):
		return
	var scale_y := get_viewport_rect().size.y / screen.y
	get_child(0).offset_top = maxf(30, safe.position.y * scale_y + 12)
	# Move the whole HUD inside the bottom system gesture area.
	var inset := maxf(24, (screen.y - safe.end.y) * scale_y + 12)
	get_child(2).offset_bottom = -inset
	get_child(2).offset_top = -inset - 231

func make_button(label: String, command: String, parent: Node) -> Button:
	var button := Button.new()
	button.text = label
	button.custom_minimum_size = Vector2(216, 132)
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(func(): action.emit(command))
	parent.add_child(button)
	return button

func populate(units: Array[UnitState]) -> void:
	for child in portraits.get_children():
		portraits.remove_child(child)
		child.queue_free()
	cards.clear()
	for u in units:
		if u.team != 0 or cards.size() >= 8:
			continue
		var card := Button.new()
		card.custom_minimum_size = Vector2(238, 198)
		card.add_theme_font_size_override("font_size", 32)
		card.focus_mode = Control.FOCUS_NONE
		var health_bar := ProgressBar.new()
		health_bar.name = "Health"
		health_bar.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
		health_bar.offset_left = 14
		health_bar.offset_right = -14
		health_bar.offset_top = -22
		health_bar.offset_bottom = -10
		health_bar.show_percentage = false
		health_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card.add_child(health_bar)
		card.gui_input.connect(func(event: InputEvent):
			if event is InputEventScreenTouch and event.pressed:
				touch_origin = event.position
				touch_moved = false
			elif event is InputEventScreenDrag and event.position.distance_to(touch_origin) > 10:
				touch_moved = true
		)
		card.pressed.connect(func():
			if touch_moved:
				touch_moved = false
				return
			var now := Time.get_ticks_msec() / 1000.0
			var double := last_portrait == u.id and now - last_portrait_time < 0.330
			portrait.emit(u.id, double)
			last_portrait = -1 if double else u.id
			last_portrait_time = now
		)
		portraits.add_child(card)
		cards[u.id] = card

func refresh(sim: BattleSim, selected: Array[int], box_mode: bool, follow: int) -> void:
	var enemies := sim.units.filter(func(u: UnitState): return u.team == 1 and not u.down).size()
	status.text = "%s\n敵人 %d · 已選 %d" % ["已暫停" if sim.paused else ("慢鏡 ¼" if sim.speed < 1 else "荒原小隊"), enemies, selected.size()]
	notice.text = sim.notice
	if selected.size() == 1:
		var chosen := sim.find_unit(selected[0])
		if chosen:
			notice.text += "\n頭 %d · 身 %d · 左 %d · 右 %d · 腳 %d" % chosen.health
	pause_button.text = "▶ 繼續" if sim.paused else "Ⅱ 暫停"
	slow_button.text = "✓ ¼ 慢鏡" if sim.speed < 1 else "¼ 慢鏡"
	select_button.text = "✓ 框選" if box_mode else "框選"
	auto_button.set_pressed_no_signal(sim.auto_pause)
	for id in cards:
		var u := sim.find_unit(id)
		var hp := ""
		for i in 5:
			hp += "●" if u.ratio(i) > 0.6 else ("◐" if u.health[i] > 0 else "○")
		cards[id].text = "%s%s\n%s\n%s%s" % ["▸ " if id in selected else "", u.definition.label, hp, "跟隨 · " if follow == id else "", u.status]
		cards[id].modulate = Color("f0cb79") if id in selected else Color.WHITE
		cards[id].get_node("Health").value = u.health.reduce(func(a, b): return a + b, 0.0) / u.maximum.reduce(func(a, b): return a + b, 0.0) * 100
