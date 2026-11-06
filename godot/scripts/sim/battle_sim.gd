class_name BattleSim
extends RefCounted

var units: Array[UnitState] = []
var paused := false
var speed := 1.0
var auto_pause := true
var alerted := false
var elapsed := 0.0
var notice := "點選隊友，再點地面移動"
var rng := RandomNumberGenerator.new()
var events: Array[Dictionary] = []
var encounter_range := 6.0
var result := ""
var occluded: Dictionary = {}

func setup(encounter: EncounterDefinition, stress := false) -> void:
	rng.seed = 11
	encounter_range = encounter.encounter_range
	for i in (10 if stress else encounter.allies.size()):
		units.append(UnitState.new(i, 0, encounter.allies[i % encounter.allies.size()], Vector3(-6 + (i % 3) * 1.2, 0, 4 + (i / 3) * 1.1)))
	for i in (10 if stress else encounter.enemy_count):
		units.append(UnitState.new(100 + i, 1, encounter.enemy, Vector3(5 + (i % 3) * 1.2, 0, -5 + (i / 3) * 1.1)))

func find_unit(id: int) -> UnitState:
	for u in units:
		if u.id == id:
			return u
	return null

func issue(ids: Array[int], kind: String, point := Vector3.ZERO, target := -1) -> void:
	var active: Array[UnitState] = []
	for id in ids:
		var u := find_unit(id)
		if u and u.team == 0 and not u.down:
			active.append(u)
	for i in active.size():
		var u := active[i]
		var slot := point
		if kind == "move":
			var cols := ceili(sqrt(active.size()))
			var rows := ceili(float(active.size()) / cols)
			slot += Vector3((i % cols - (cols - 1) * 0.5) * 0.85, 0, (i / cols - (rows - 1) * 0.5) * 0.85)
		if not paused:
			u.commands.clear()
		elif u.commands.size() >= 6:
			u.commands.pop_front()
		u.commands.append(BattleCommand.new(kind, slot, target))
	notice = ("已排隊 · 繼續後執行" if paused else "已下達指令") if not active.is_empty() else "先揀可行動隊友"

func tick(dt: float) -> void:
	events.clear()
	if paused or not result.is_empty():
		return
	if auto_pause and not alerted:
		for a in units:
			if a.team != 0 or a.down:
				continue
			for b in units:
				if b.team == 1 and not b.down and a.position.distance_to(b.position) < encounter_range:
					alerted = true
					paused = true
					notice = "發現敵人 · 已自動暫停"
					return
	var step := dt * speed
	elapsed += step
	for u in units:
		u.wants_move = false
		u.cooldown = maxf(0, u.cooldown - step)
		u.attack_flash = maxf(0, u.attack_flash - step)
		if u.down:
			u.status = "倒地"
			continue
		var target: UnitState = null
		if not u.commands.is_empty():
			var command := u.commands[0]
			if command.kind == "move":
				u.destination = command.destination
				u.wants_move = u.position.distance_to(u.destination) > 0.3
				u.status = "移動"
				if not u.wants_move:
					u.commands.pop_front()
				continue
			target = find_unit(command.target_id)
			if not target or target.down or target.team == u.team:
				u.commands.pop_front()
				continue
		else:
			var nearest := encounter_range
			for other in units:
				var distance := u.position.distance_to(other.position)
				if other.team != u.team and not other.down and distance < nearest:
					nearest = distance
					target = other
		if target:
			u.facing = (target.position - u.position).normalized()
			u.destination = target.position
			u.wants_move = u.position.distance_to(target.position) > u.definition.weapon.reach * 0.95 or occluded.has(Vector2i(u.id, target.id))
			u.status = "追擊" if u.wants_move else "攻擊"
			if not u.wants_move and u.cooldown <= 0:
				attack(u, target)
		else:
			u.status = "待命"
	if units.filter(func(u: UnitState): return u.team == 1 and not u.down).is_empty():
		result = "勝利 · 敵人全部倒地"
	elif units.filter(func(u: UnitState): return u.team == 0 and not u.down).is_empty():
		result = "全隊倒地 · 可讀檔或重新開始"
	if not result.is_empty():
		paused = true
		notice = result

func attack(u: UnitState, target: UnitState) -> void:
	var weapon: CombatGear = u.definition.weapon
	var armor: CombatGear = target.definition.armor
	u.cooldown = weapon.cooldown
	u.attack_flash = 0.22
	var hit_chance := clampf(0.6 + (u.definition.attack - target.definition.dodge - armor.dodge_modifier) * 0.008, 0.12, 0.95)
	var hit := rng.randf() <= hit_chance
	events.append({"from": u.position, "to": target.position, "ranged": weapon.reach > 2, "hit": hit})
	if not hit:
		return
	var roll := rng.randi_range(1, 100)
	var part := 0
	for weight in [12, 35, 15, 15, 23]:
		roll -= weight
		if roll <= 0:
			break
		part += 1
	var arm := (0.35 if u.health[3] <= 0 else 0.6 + 0.4 * u.ratio(3)) * (0.85 if u.health[2] <= 0 else 1.0)
	var damage := rng.randf_range(weapon.damage_min, weapon.damage_max) * (1 + u.definition.attack * 0.02) * arm
	if weapon.heavy:
		damage *= 1 + u.definition.strength * 0.015
	damage *= (1 - armor.reduction) / (1 + target.definition.toughness * 0.025)
	target.health[part] = maxf(0, target.health[part] - damage)
	if target.health[0] <= 0 or target.health[1] <= 0:
		target.down = true
		target.commands.clear()
		target.wants_move = false

func blocked(u: UnitState) -> void:
	u.wants_move = false
	u.status = "無法到達"
	if not u.commands.is_empty():
		u.commands.pop_front()
	if u.team == 0:
		notice = "路線受阻 · 請選另一個位置"

func encode() -> Dictionary:
	return {"version": 1, "units": units.map(func(u: UnitState): return u.encode()),
		"paused": paused, "speed": speed, "auto_pause": auto_pause, "alerted": alerted,
		"elapsed": elapsed, "rng_state": str(rng.state), "result": result, "encounter_range": encounter_range}
