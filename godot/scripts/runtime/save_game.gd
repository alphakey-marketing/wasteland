class_name BattleSave
extends RefCounted

const PATH := "user://battle_v1.json"
const DEFINITIONS := ["res://data/rock.tres", "res://data/white.tres", "res://data/iron.tres", "res://data/shadow.tres", "res://data/enemy.tres"]

static func write(sim: BattleSim, view: Dictionary, path := PATH) -> Error:
	var data := sim.encode()
	data["view"] = view
	var file := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	if not file:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(data))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		return error
	return DirAccess.rename_absolute(path + ".tmp", path)

static func read(path := PATH) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var parser := JSON.new()
	if parser.parse(FileAccess.get_file_as_string(path)) != OK:
		return {}
	var data: Variant = parser.data
	return data if valid(data) else {}

static func vector_valid(value: Variant) -> bool:
	if not value is Array or value.size() != 3:
		return false
	for number in value:
		if not (number is float or number is int) or not is_finite(float(number)) or absf(float(number)) > 100:
			return false
	return true

static func valid(data: Variant) -> bool:
	if not data is Dictionary or data.get("version") != 1 or not data.get("units") is Array:
		return false
	if data.units.is_empty() or data.units.size() > 20:
		return false
	for key in ["paused", "auto_pause", "alerted"]:
		if not data.get(key) is bool:
			return false
	if not data.get("speed") in [1.0, 0.25] or not data.get("rng_state") is String or not data.rng_state.is_valid_int():
		return false
	for key in ["elapsed", "encounter_range"]:
		if not (data.get(key) is float or data.get(key) is int) or not is_finite(float(data[key])) or data[key] < 0:
			return false
	if not data.get("result") is String:
		return false
	var ids: Array[int] = []
	for u in data.units:
		if not u is Dictionary or not u.get("definition") in DEFINITIONS or not (u.get("team") is float or u.get("team") is int):
			return false
		if u.team != 0 and u.team != 1:
			return false
		if not (u.get("id") is int or u.get("id") is float) or int(u.id) != u.id or int(u.id) in ids:
			return false
		ids.append(int(u.id))
		if not vector_valid(u.get("position")) or not vector_valid(u.get("facing")) or not u.get("down") is bool or not u.get("status") is String:
			return false
		if not (u.get("cooldown") is float or u.get("cooldown") is int) or not is_finite(float(u.cooldown)) or u.cooldown < 0:
			return false
		if not u.get("health") is Array or u.health.size() != 5 or not u.get("commands") is Array or u.commands.size() > 6:
			return false
		for hp in u.health:
			if not (hp is float or hp is int) or not is_finite(float(hp)) or hp < 0 or hp > 1000:
				return false
		for c in u.commands:
			if not c is Dictionary or not c.get("kind") in ["move", "attack"] or not vector_valid(c.get("point")):
				return false
			if not (c.get("target") is float or c.get("target") is int):
				return false
	for u in data.units:
		for c in u.commands:
			if c.kind == "attack" and not int(c.target) in ids:
				return false
	return true

static func restore(data: Dictionary) -> BattleSim:
	var sim := BattleSim.new()
	for o in data.units:
		var u := UnitState.new(int(o.id), int(o.team), load(o.definition), Vector3(o.position[0], o.position[1], o.position[2]))
		u.health.assign(o.health)
		u.cooldown = o.cooldown
		u.down = o.down
		u.status = o.status
		u.facing = Vector3(o.facing[0], o.facing[1], o.facing[2])
		for c in o.commands:
			u.commands.append(BattleCommand.decode(c))
		sim.units.append(u)
	sim.paused = data.paused
	sim.speed = data.speed
	sim.auto_pause = data.auto_pause
	sim.alerted = data.alerted
	sim.elapsed = data.elapsed
	sim.rng.state = int(data.rng_state)
	sim.result = data.result
	sim.encounter_range = data.encounter_range
	return sim
