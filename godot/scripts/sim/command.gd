class_name BattleCommand
extends RefCounted

var kind := "move"
var destination := Vector3.ZERO
var target_id := -1

func _init(type: String = "move", point := Vector3.ZERO, target := -1) -> void:
	kind = type
	destination = point
	target_id = target

func encode() -> Dictionary:
	return {"kind": kind, "point": [destination.x, destination.y, destination.z], "target": target_id}

static func decode(data: Dictionary) -> BattleCommand:
	return BattleCommand.new(data.kind, Vector3(data.point[0], data.point[1], data.point[2]), int(data.target))
