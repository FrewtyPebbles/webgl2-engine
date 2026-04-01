export default `#version 300 es
precision lowp float;
precision lowp sampler2DArrayShadow;

#define N_DIRECTIONAL_LIGHTS 10
#define N_POINT_LIGHTS 10
#define N_SPOT_LIGHTS 10

struct PointLight {
    vec3 position;
    vec3 color;
    float range;
    float energy;

    float ambient;
    float diffuse;
    float specular;
};

struct SpotLight {
    vec3 position;
    vec3 color;
    mat4 rotation;
    float energy;
    float range;
    float cookie_radius;

    float ambient;
    float diffuse;
    float specular;
};

struct DirectionalLight {
    mat4 rotation;
    vec3 color;
    float energy;

    float ambient;
    float diffuse;
    float specular;
};

struct Environment {
    vec3 ambient_light;
};

layout(std140) uniform u_global {
    mediump int directional_lights_count;
    mediump int point_lights_count;
    mediump int spot_lights_count;

    PointLight point_lights[N_POINT_LIGHTS];

    SpotLight spot_lights[N_SPOT_LIGHTS];

    DirectionalLight directional_lights[N_DIRECTIONAL_LIGHTS];
    
    Environment environment;
    
    vec2 shadow_map_size;

    mat4 u_directional_light_space_matrix[N_DIRECTIONAL_LIGHTS];
    mat4 u_point_light_space_matrix[N_POINT_LIGHTS * 6];
    vec3 camera_position;
};

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