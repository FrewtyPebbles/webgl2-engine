#version 300 es
precision highp float;

// Vertex position attribute
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

out vec3 v_frag_pos;
out vec3 v_normal;
out vec2 v_uv;

// Uniform MVP matrix
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

void main() {

    v_frag_pos = vec3(u_model * vec4(a_position, 1.0));

    // Transform the vertex by the MVP matrix
    gl_Position = u_projection * u_view * vec4(v_frag_pos, 1.0);

    // Pass the uv and normal to fragment shader
    v_normal = mat3(transpose(inverse(u_model))) * a_normal;
    v_uv = a_uv;
}