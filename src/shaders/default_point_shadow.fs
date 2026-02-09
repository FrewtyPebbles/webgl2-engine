#version 300 es
precision lowp float;

in vec4 v_frag_pos;
out vec4 frag_color;


uniform vec3 origin;
uniform float range;


void main()
{
    float dist = length(v_frag_pos.xyz - origin);
    gl_FragDepth = dist / range;
}
