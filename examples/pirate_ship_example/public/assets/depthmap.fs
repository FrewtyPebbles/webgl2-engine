#version 300 es
precision highp float;
precision highp sampler2DArray;

in vec2 v_uv;

out vec4 frag_color;

uniform sampler2DArray sprite_texture;


void main() {
    vec4 depthSample = texture(sprite_texture, vec3(v_uv, 1.0));
    float depth = depthSample.r;

    frag_color = vec4(vec3(depth), 1.0);
}
