#version 300 es
#define N_POINT_LIGHTS 50
#define N_SPOT_LIGHTS 50
#define N_DIRECTIONAL_LIGHTS 10
#define PI 3.14159265358979323846264338327950288419716939937510
precision highp float;
precision highp sampler2DArray;

in vec3 v_normal;
in vec2 v_uv;
in vec3 v_frag_pos;
in vec4 v_frag_pos_light_space[N_DIRECTIONAL_LIGHTS];


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
uniform int point_lights_count;

uniform SpotLight spot_lights[N_SPOT_LIGHTS];
uniform int spot_lights_count;

uniform DirectionalLight directional_lights[N_DIRECTIONAL_LIGHTS];
uniform int directional_lights_count;

uniform Material material;

uniform Environment environment;

uniform vec3 camera_position;

uniform sampler2DArray directional_light_shadow_map;

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

float calculate_shadow(vec4 frag_pos_light_space);

void main() {
    vec4 base_color = texture(material_texture_albedo, v_uv);

    vec3 lighting = calculate_lighting(base_color);

    base_color.rgb = environment.ambient_light * base_color.rgb + lighting;

    frag_color = base_color;
}

float calculate_shadow(int index) {
    vec4 frag_pos_light_space = v_frag_pos_light_space[index];
    vec3 proj_coords = frag_pos_light_space.xyz / frag_pos_light_space.w;
    proj_coords = proj_coords * 0.5 + 0.5;

    float closest_depth = texture(directional_light_shadow_map, vec3(proj_coords.xy, float(index))).z;
    
    float current_depth = proj_coords.z;
    
    float shadow = current_depth > closest_depth ? 1.0 : 0.0;

    return shadow;
}

vec3 calculate_lighting(vec4 base_color) {
    vec3 cumulative_radiance = vec3(0.0,0.0,0.0);

    cumulative_radiance += calculate_point_lighting(base_color);

    cumulative_radiance += calculate_directional_lighting(base_color);

    return cumulative_radiance;
}

vec3 calculate_point_lighting(vec4 base_color) {
    vec3 cumulative_radiance = vec3(0.0,0.0,0.0);

    for (int i = 0; i < point_lights_count; i++) {
        PointLight light = point_lights[i];
        vec3 light_dir = normalize(light.position - v_frag_pos);
        float n_dot_l = max(dot(v_normal, light_dir), 0.0);
        vec3 product = Fr(light_dir, base_color) * L(light) * n_dot_l;
        float shadow = calculate_shadow(i);
        float visibility = 1.0 - shadow;
        cumulative_radiance += product * light.color * visibility;
    }

    return cumulative_radiance;
}

vec3 calculate_directional_lighting(vec4 base_color) {
    vec3 cumulative_radiance = vec3(0.0,0.0,0.0);

    for (int i = 0; i < directional_lights_count; i++) {
        DirectionalLight light = directional_lights[i];
        vec3 light_dir = (light.rotation * vec4(1.0,0.0,0.0, 0.0)).xyz;
        float n_dot_l = max(dot(v_normal, light_dir), 0.0);
        vec3 product = Fr(light_dir, base_color) * L(light) * n_dot_l;
        cumulative_radiance += product * light.color;
    }

    return cumulative_radiance;
}

vec3 Fr(vec3 light_dir, vec4 albedo_color) {

    // COOK TORRANCE
    vec3 view_vector = normalize(camera_position - v_frag_pos);
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
    float light_distance = distance(v_frag_pos, light.position);
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
}