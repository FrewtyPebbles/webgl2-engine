export default `#version 300 es
precision highp float;

in vec2 v_uv;

out vec4 frag_color;

uniform sampler2D sprite_texture;

void main() {
    frag_color = texture(sprite_texture, vec2(v_uv.x, v_uv.y));
}
`;