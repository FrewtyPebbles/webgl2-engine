#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_uv;
in vec3 v_frag_pos;


out vec4 frag_color;

#define N_POINT_LIGHTS 50
#define N_SPOT_LIGHTS 50
#define N_DIRECTIONAL_LIGHTS 10
#define PI 3.14159265358979323846264338327950288419716939937510

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

uniform vec3 camera_position;

float L(PointLight light);

float distribution_GGX(vec3 N, vec3 H, float a);
float geometry_schlick_GGX(float NdotV, float k);
float geometry_smith(vec3 N, vec3 V, vec3 L, float k);
vec3 fresnel_schlick(float cosTheta, vec3 F0);

vec3 Fr(PointLight light, vec3 light_dir, vec4 albedo_color);

void main() {
    vec4 base_color = texture(material_texture_albedo, v_uv);

    vec3 total_specular_diffuse = vec3(0.0,0.0,0.0);

    for (int i = 0; i < point_lights_count; i++) {
        PointLight light = point_lights[i];
        vec3 light_dir = normalize(light.position - v_frag_pos);
        float n_dot_l = max(dot(v_normal, light_dir), 0.0);
        total_specular_diffuse += Fr(light, light_dir, base_color) * L(light) * n_dot_l;
    }

    base_color.rgb += total_specular_diffuse;

    frag_color = base_color;
}

vec3 cook_torrance(PointLight light, vec3 light_dir, vec4 albedo_color) {
    // f_\text{CookTorrance} = \frac{DGF}{4(\omega_0 * n)(\omega_i * n)}
    vec3 view_vector = normalize(camera_position - v_frag_pos);
    vec3 halfway_vector = (light_dir + view_vector) / length(light_dir + view_vector);
    float D = distribution_GGX(v_normal, halfway_vector, material.roughness);
    float G = geometry_smith(v_normal, view_vector, light_dir, material.roughness);
    vec3 F0 = vec3(0.04); 
    F0 = mix(F0, albedo_color.rgb, material.metalic);
    vec3 F = fresnel_schlick(max(dot(halfway_vector, view_vector), 0.0), F0);
    vec3 numerator    = D * G * F;
    float denominator = 4.0 * max(dot(v_normal, view_vector), 0.0) * max(dot(v_normal, light_dir), 0.0)  + 0.0001;
    vec3 specular = numerator / denominator; 

    return specular;
}

vec3 Fr(PointLight light, vec3 light_dir, vec4 albedo_color) {
    // Cook-Torrance BRDF
    float kd = light.diffuse;
    float ks = light.specular;
    vec3 f_lambert = albedo_color.rgb / PI;
    vec3 f_cook_torrance = cook_torrance(light, light_dir, albedo_color);

    

    return kd * f_lambert + ks * f_cook_torrance;
}

float L(PointLight light) {
    float light_distance = distance(v_frag_pos, light.position);
    // Standard ranged attenuation
    float attenuation = clamp(1.0 - light_distance / light.range, 0.0, 1.0);
    return light.energy * attenuation * attenuation;
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