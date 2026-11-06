shader_type spatial;
render_mode unshaded, cull_front;
void vertex() { VERTEX += NORMAL * 0.012; }
void fragment() { ALBEDO = vec3(0.075, 0.065, 0.055); }
