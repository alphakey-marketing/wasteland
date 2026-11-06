extends GutTest

func test_tap_pan_and_long_press_are_exclusive() -> void:
	var g := BattleGesture.new()
	g.press(0, Vector2.ZERO)
	g.advance(0.2)
	assert_eq(g.release(0), "tap")
	g.press(0, Vector2.ZERO)
	g.drag(0, Vector2(11, 0))
	g.advance(1)
	assert_eq(g.mode, "pan")
	assert_eq(g.release(0), "")
	g.press(0, Vector2.ZERO)
	g.advance(0.321)
	g.drag(0, Vector2(80, 80))
	assert_eq(g.mode, "box")
	assert_eq(g.pan_delta, Vector2.ZERO)
	assert_eq(g.release(0), "box")

func test_pinch_cancels_box_and_never_taps_on_release() -> void:
	var g := BattleGesture.new()
	g.press(0, Vector2.ZERO)
	g.advance(0.4)
	g.press(1, Vector2(100, 0))
	g.drag(1, Vector2(200, 0))
	assert_eq(g.mode, "pinch")
	assert_eq(g.zoom_ratio, 0.5)
	assert_eq(g.release(1), "")
	assert_eq(g.release(0), "")
	assert_true(g.fingers.is_empty())

func test_explicit_box_cancel_and_ui_release() -> void:
	var g := BattleGesture.new()
	g.box_mode = true
	g.press(4, Vector2(20, 20))
	assert_eq(g.mode, "box")
	g.drag(4, Vector2(100, 100))
	assert_eq(g.release(4, true), "")
	g.press(0, Vector2.ZERO)
	g.cancel()
	assert_eq(g.mode, "idle")
	assert_eq(g.release(0), "")
