export default `#version 300 es
precision lowp float;
precision lowp sampler2DArrayShadow;

uniform mediump int directional_lights_count;
uniform mediump int point_lights_count;
uniform mediump int spot_lights_count;

#define N_DIRECTIONAL_LIGHTS 10
#define N_POINT_LIGHTS 10
#define N_SPOT_LIGHTS 10

// Vertex position attribute
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

out vec3 v_normal;
out vec2 v_uv;
out vec4 v_frag_pos;


// Uniform MVP matrix
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

void main() {

    v_frag_pos = u_model * vec4(a_position, 1.0);
    v_normal = normalize(mat3(transpose(inverse(u_model))) * a_normal);
    v_uv = a_uv;

    gl_Position = u_projection * u_view * v_frag_pos;
}`;