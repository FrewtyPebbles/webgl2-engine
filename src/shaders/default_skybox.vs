#version 300 es
precision lowp float;

layout(location = 0) in vec3 a_position;

out vec3 v_texCoord;

uniform mat4 u_view;
uniform mat4 u_projection;

void main() {
    // Remove translation from view matrix
    mat4 rotView = mat4(mat3(u_view));

    v_texCoord = a_position;

    gl_Position = u_projection * rotView * vec4(a_position, 1.0);

    // Make sure depth is at far plane
    gl_Position = gl_Position.xyww;
}
