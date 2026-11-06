class_name BattleGesture
extends RefCounted

const LONG := 0.320
const DRAG := 10.0
var mode := "idle"
var fingers: Dictionary = {}
var start := Vector2.ZERO
var current := Vector2.ZERO
var age := 0.0
var box_mode := false
var pan_delta := Vector2.ZERO
var zoom_ratio := 1.0

func press(id: int, point: Vector2) -> void:
	fingers[id] = point
	if fingers.size() == 1:
		start = point
		current = point
		age = 0
		mode = "box" if box_mode else "pending"
	elif fingers.size() == 2:
		mode = "pinch"

func advance(dt: float) -> void:
	if mode == "pending":
		age += dt
		if age >= LONG:
			mode = "box"

func drag(id: int, point: Vector2) -> void:
	pan_delta = Vector2.ZERO
	zoom_ratio = 1
	if not fingers.has(id):
		return
	if mode == "pinch" and fingers.size() == 2:
		var keys := fingers.keys()
		var old: float = fingers[keys[0]].distance_to(fingers[keys[1]])
		fingers[id] = point
		var distance: float = fingers[keys[0]].distance_to(fingers[keys[1]])
		zoom_ratio = old / maxf(1, distance)
		return
	var previous: Vector2 = fingers[id]
	fingers[id] = point
	current = point
	if mode == "pending" and point.distance_to(start) > DRAG:
		mode = "pan"
	if mode == "pan":
		pan_delta = point - previous

func release(id: int, cancelled := false) -> String:
	if not fingers.has(id):
		return ""
	fingers.erase(id)
	var action := ""
	if not cancelled:
		if mode == "pending":
			action = "tap"
		elif mode == "box":
			action = "tap" if start.distance_to(current) < 6 else "box"
	mode = "idle" if fingers.is_empty() else "done"
	return action

func cancel() -> void:
	fingers.clear()
	mode = "idle"
