#version 300 es
precision highp float;

in vec2 v_uv;

out vec4 frag_color;

uniform sampler2D sprite_texture;

void main() {
    float depth_value = texture(sprite_texture, v_uv).r;
    frag_color = vec4(vec3(depth_value), 1.0);
}
