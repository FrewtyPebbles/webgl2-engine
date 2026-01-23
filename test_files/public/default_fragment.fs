#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;

out vec4 frag_color;

uniform sampler2D albedo_texture;

void main() {
    frag_color = texture(albedo_texture, vec2(v_uv.x, v_uv.y));
}
