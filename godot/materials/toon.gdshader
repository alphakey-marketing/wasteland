shader_type spatial;
render_mode diffuse_toon, specular_disabled;
uniform sampler2D paint_texture : source_color, filter_nearest, repeat_enable;
uniform vec4 tint : source_color = vec4(1.0);
void fragment() {
 ALBEDO = texture(paint_texture, UV).rgb * tint.rgb;
 ROUGHNESS = 1.0;
}
void light() {
 float n = dot(NORMAL, LIGHT);
 float band = n > 0.55 ? 1.0 : (n > 0.0 ? 0.65 : 0.28);
 DIFFUSE_LIGHT += ALBEDO * LIGHT_COLOR * band * ATTENUATION;
}
