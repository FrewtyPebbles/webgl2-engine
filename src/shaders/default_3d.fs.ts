export default `#version 300 es
precision lowp float;
precision lowp sampler2DArrayShadow;

uniform mediump int directional_lights_count;
uniform mediump int point_lights_count;
uniform mediump int spot_lights_count;

#define N_DIRECTIONAL_LIGHTS 10
#define N_POINT_LIGHTS 10
#define N_SPOT_LIGHTS 10
#define PI 3.14159265358979323846264338327950288419716939937510

in vec3 v_normal;
in vec2 v_uv;
in vec4 v_frag_pos;

out vec4 frag_color;


struct Environment {
    vec3 ambient_light;
};

// fallback values
struct Material {
    bool has_normal_texture;
    bool has_albedo_texture;
    vec3 albedo;

    bool has_metalic_texture;
    float metalic;
    bool has_roughness_texture;
    float roughness;
    bool has_ao_texture;
    float ao;
};

// PBR
uniform sampler2D material_texture_albedo;
uniform sampler2D material_texture_normal;
uniform sampler2D material_texture_metalic;
uniform sampler2D material_texture_roughness;
uniform sampler2D material_texture_ao;

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

uniform PointLight point_lights[N_POINT_LIGHTS];

uniform SpotLight spot_lights[N_SPOT_LIGHTS];

uniform DirectionalLight directional_lights[N_DIRECTIONAL_LIGHTS];

uniform Material material;

uniform Environment environment;

uniform vec3 camera_position;

uniform sampler2DArrayShadow directional_light_shadow_maps;
uniform sampler2DArrayShadow point_light_shadow_maps;

uniform vec2 shadow_map_size;

uniform mat4 u_directional_light_space_matrix[N_DIRECTIONAL_LIGHTS];
uniform mat4 u_point_light_space_matrix[N_POINT_LIGHTS * 6];

float L(PointLight light);
float L(DirectionalLight light);

float distribution_GGX(vec3 N, vec3 H, float a);
float geometry_schlick_GGX(float NdotV, float k);
float geometry_smith(vec3 N, vec3 V, vec3 L, float k);
vec3 fresnel_schlick(float cosTheta, vec3 F0);

vec3 Fr(vec3 light_dir, vec4 albedo_color);

vec3 calculate_point_lighting(vec4 base_color);

vec3 calculate_directional_lighting(vec4 base_color);

vec3 calculate_lighting(vec4 base_color);

float calculate_point_shadow(int index, PointLight light);

float calculate_directional_shadow(int index, vec3 light_dir);

void main() {
    
    vec4 base_color = texture(material_texture_albedo, v_uv);

    vec3 lighting = calculate_lighting(base_color);

    base_color.rgb = environment.ambient_light * base_color.rgb + lighting;

    frag_color = base_color;
}

int get_point_shadow_face_index(int origin, vec3 dir) {
    vec3 abs_dir = abs(dir);
    
    int index = 0;
    
    // Directly compare the absolute values
    if (abs_dir.x >= abs_dir.y && abs_dir.x >= abs_dir.z) {
        // X is dominant
        index = (dir.x > 0.0) ? 0 : 1;
    } else if (abs_dir.y >= abs_dir.z) {
        // Y is dominant
        index = (dir.y > 0.0) ? 2 : 3;
    } else {
        // Z is dominant
        index = (dir.z > 0.0) ? 4 : 5;
    }
    
    return origin + index;
}

float calculate_point_shadow(int index, PointLight light) {
    vec3 light_to_frag = v_frag_pos.xyz - light.position;
    float light_distance = length(light_to_frag);
    vec3 dir = normalize(light_to_frag);

    float bias = max(0.015 * (1.0 - dot(v_normal, -dir)), 0.003);

    int face_index = get_point_shadow_face_index(index * 6, dir);

    vec4 frag_light = u_point_light_space_matrix[face_index] * v_frag_pos;
    vec3 proj = frag_light.xyz / frag_light.w;
    proj = proj * 0.5 + 0.5;

    float current_depth = light_distance / light.range;

    float shadow = 0.0;
    float sample_scale = 10.0;
    vec2 texel_size = 1.0 / shadow_map_size;
    // for(int x = -1; x <= 1; ++x) {
    //     for(int y = -1; y <= 1; ++y) {
    //         shadow += texture(
    //             point_light_shadow_maps,
    //             vec4(
    //                 proj.xy + vec2(x, y)
    //                 * sample_scale
    //                 * texel_size,
    //                 float(face_index),
    //                 current_depth - bias
    //             )
    //         );
    //     }
    // }
    // shadow /= 9.0;

    shadow += texture(
        point_light_shadow_maps,
        vec4(
            proj.xy,
            float(face_index),
            current_depth - bias
        )
    );

    return shadow;
}

vec3 calculate_point_lighting(vec4 base_color) {
    vec3 cumulative_radiance = vec3(0.0,0.0,0.0);

    for (int i = 0; i < point_lights_count; i++) {
        PointLight light = point_lights[i];
        vec3 light_dir = normalize(light.position - v_frag_pos.xyz);
        float n_dot_l = max(dot(v_normal, light_dir), 0.0);
        vec3 product = Fr(light_dir, base_color) * L(light) * n_dot_l;
        float shadow = calculate_point_shadow(i, light);
        cumulative_radiance += product * light.color * shadow;
    }

    return cumulative_radiance;
}

float calculate_directional_shadow(int index, vec3 light_dir) {
    vec4 frag_pos_light_space = u_directional_light_space_matrix[index] * v_frag_pos;
    vec3 proj_coords = frag_pos_light_space.xyz / frag_pos_light_space.w;
    proj_coords = proj_coords * 0.5 + 0.5;

    float bias = max(0.05 * (1.0 - dot(v_normal, light_dir)), 0.005);

    float current_depth = proj_coords.z - bias;

    // apply blur to shadow edges
    float shadow = 0.0;

    // vec2 texel_size = 1.0 / shadow_map_size;
    // for(int x = -1; x <= 1; ++x) {
    //     for(int y = -1; y <= 1; ++y) {
    //         shadow += texture(directional_light_shadow_maps, vec4(
    //             proj_coords.xy
    //             + vec2(x, y)
    //             * texel_size
    //             , 
    //             float(index), 
    //             current_depth
    //         ));
    //     }
    // }
    // shadow /= 9.0

    shadow += texture(directional_light_shadow_maps, vec4(
        proj_coords.xy, 
        float(index), 
        current_depth
    ));

    return shadow;
}

vec3 calculate_lighting(vec4 base_color) {
    vec3 cumulative_radiance = vec3(0.0,0.0,0.0);

    cumulative_radiance += calculate_point_lighting(base_color);

    cumulative_radiance += calculate_directional_lighting(base_color);

    return cumulative_radiance;
}

vec3 calculate_directional_lighting(vec4 base_color) {
    vec3 cumulative_radiance = vec3(0.0,0.0,0.0);

    for (int i = 0; i < directional_lights_count; i++) {
        DirectionalLight light = directional_lights[i];
        vec3 light_dir = (light.rotation * vec4(1.0,0.0,0.0, 0.0)).xyz;
        float n_dot_l = max(dot(v_normal, light_dir), 0.0);
        vec3 product = Fr(light_dir, base_color) * L(light) * n_dot_l;
        float shadow = calculate_directional_shadow(i, light_dir);
        cumulative_radiance += product * light.color * shadow;
    }

    return cumulative_radiance;
}

vec3 Fr(vec3 light_dir, vec4 albedo_color) {

    // COOK TORRANCE
    vec3 view_vector = normalize(camera_position - v_frag_pos.xyz);
    vec3 halfway_vector = (light_dir + view_vector) / length(light_dir + view_vector);
    
    /// DGF
    float D = distribution_GGX(v_normal, halfway_vector, material.roughness);
    float G = geometry_smith(v_normal, view_vector, light_dir, material.roughness);
    vec3 F0 = vec3(0.04); 
    F0 = mix(F0, albedo_color.rgb, material.metalic);
    vec3 F = fresnel_schlick(max(dot(halfway_vector, view_vector), 0.0), F0);
    
    vec3 numerator    = D * G * F;
    float denominator = 4.0 * max(dot(v_normal, view_vector), 0.0) * max(dot(v_normal, light_dir), 0.0)  + 0.0001;
    vec3 specular = numerator / denominator; 

    vec3 ks = F;
    vec3 kd = vec3(1.0) - ks;
    kd *= 1.0 - material.metalic;

    vec3 f_lambert = albedo_color.rgb / PI;


    return kd * f_lambert + specular;
}

float L(PointLight light) {
    float light_distance = distance(v_frag_pos.xyz, light.position);
    // Standard ranged attenuation
    float attenuation = clamp(1.0 - light_distance / light.range, 0.0, 1.0);
    return light.energy * attenuation * attenuation;
}

float L(DirectionalLight light) {
    return light.energy;
}

float distribution_GGX(vec3 N, vec3 H, float a)
{
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;
	
    float nom    = a2;
    float denom  = (NdotH2 * (a2 - 1.0) + 1.0);
    denom        = PI * denom * denom;
	
    return nom / denom;
}


float geometry_schlick_GGX(float NdotV, float k)
{
    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;
	
    return nom / denom;
}
  
float geometry_smith(vec3 N, vec3 V, vec3 L, float k)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx1 = geometry_schlick_GGX(NdotV, k);
    float ggx2 = geometry_schlick_GGX(NdotL, k);
	
    return ggx1 * ggx2;
}

vec3 fresnel_schlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}`;