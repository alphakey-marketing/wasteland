class_name UnitState
extends RefCounted

const PARTS := ["head", "torso", "larm", "rarm", "legs"]
const FRACTIONS := [0.45, 1.0, 0.5, 0.5, 0.7]
var id := 0
var team := 0
var definition: UnitDefinition
var position := Vector3.ZERO
var health: Array[float] = []
var maximum: Array[float] = []
var commands: Array[BattleCommand] = []
var cooldown := 0.0
var down := false
var status := "待命"
var destination := Vector3.ZERO
var wants_move := false
var facing := Vector3.FORWARD
var attack_flash := 0.0

func _init(key := 0, faction := 0, spec: UnitDefinition = null, point := Vector3.ZERO) -> void:
	id = key
	team = faction
	definition = spec
	position = point
	destination = point
	if spec:
		for fraction in FRACTIONS:
			maximum.append(roundf(spec.base_health * fraction))
		health.assign(maximum)

func ratio(part: int) -> float:
	return clampf(health[part] / maximum[part], 0, 1)

func move_speed() -> float:
	return definition.speed * (0.25 if health[4] <= 0 else 0.55 + 0.45 * ratio(4))

func encode() -> Dictionary:
	return {"id": id, "team": team, "definition": definition.resource_path,
		"position": [position.x, position.y, position.z], "health": health.duplicate(),
		"cooldown": cooldown, "down": down, "status": status,
		"facing": [facing.x, facing.y, facing.z],
		"commands": commands.map(func(c: BattleCommand): return c.encode())}
