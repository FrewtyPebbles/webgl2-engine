export default `#version 300 es
precision highp float;
precision highp sampler2DArrayShadow;

uniform mediump int directional_lights_count;

#define N_DIRECTIONAL_LIGHTS 10

// Vertex position attribute
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

out vec3 v_normal;
out vec2 v_uv;
out vec3 v_frag_pos;
out vec4 v_frag_pos_light_space[N_DIRECTIONAL_LIGHTS];


// Uniform MVP matrix
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_directional_light_space_matrix[N_DIRECTIONAL_LIGHTS];


void main() {

    v_frag_pos = vec3(u_model * vec4(a_position, 1.0));
    v_normal = mat3(transpose(inverse(u_model))) * a_normal;
    v_uv = a_uv;
    for (int i = 0; i < directional_lights_count; ++i) {
        v_frag_pos_light_space[i] = u_directional_light_space_matrix[i] * vec4(v_frag_pos, 1.0);
    }

    gl_Position = u_projection * u_view * vec4(v_frag_pos, 1.0);
}`;