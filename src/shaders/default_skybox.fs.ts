export default `#version 300 es
precision lowp float;

in vec3 v_texCoord;

out vec4 fragColor;

uniform samplerCube skybox_texture;

void main() {
    fragColor = texture(skybox_texture, v_texCoord);
}
`;