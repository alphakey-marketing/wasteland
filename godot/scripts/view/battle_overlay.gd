extends Control

var battle: Node3D

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

func _draw() -> void:
	if not battle:
		return
	var camera: Camera3D = battle.camera_rig.camera
	for id in battle.selected:
		var u: UnitState = battle.sim.find_unit(id)
		if not u:
			continue
		var previous := camera.unproject_position(u.position + Vector3.UP * 0.06)
		for command in u.commands:
			var destination: Vector3 = command.destination
			if command.kind == "attack":
				var target: UnitState = battle.sim.find_unit(command.target_id)
				if not target:
					continue
				destination = target.position
			var point := camera.unproject_position(destination + Vector3.UP * 0.06)
			draw_dashed_line(previous, point, Color("e8bb6a") if command.kind == "move" else Color("e87964"), 4, 14)
			draw_circle(point, 10, Color("e8bb6a"), false, 3)
			previous = point
	if battle.gesture.mode == "box":
		var rect := Rect2(battle.gesture.start * 3, (battle.gesture.current - battle.gesture.start) * 3).abs()
		draw_rect(rect, Color(0.9, 0.7, 0.3, 0.12))
		draw_rect(rect, Color("e8bb6a"), false, 4)
	elif battle.gesture.mode == "pending" and battle.gesture.age > 0.07:
		draw_arc(battle.gesture.start * 3, 65, -PI / 2, -PI / 2 + TAU * battle.gesture.age / BattleGesture.LONG, 32, Color("e8bb6a"), 6)
	for shot in battle.shots:
		var a := camera.unproject_position(shot.from + Vector3.UP)
		var b := camera.unproject_position(shot.to + Vector3.UP)
		draw_line(a.lerp(b, shot.age / 0.22), a.lerp(b, minf(1, shot.age / 0.22 + 0.2)), Color("ffe5a3"), 5)
