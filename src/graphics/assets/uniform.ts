import { Vec2, Vec3, Vec4, Mat2, Mat3, Mat4 } from "@vicimpa/glm";
import { ShaderProgram } from "../shader_program";
import { CubeMapTexture, Texture } from "./texture";

export enum WebGLUniformType {
    TEXTURE_2D,
    TEXTURE_2D_ARRAY,
    TEXTURE_CUBE_MAP,
    SHADOW_2D,
    SHADOW_2D_ARRAY,
    SHADOW_CUBE_MAP,
    STRUCT,
    F,
    I,
    B,
    F2V,
    I2V,
    F3V,
    I3V,
    F4V,
    I4V,
    F2M,
    F3M,
    F4M,
}

export type UniformValueType = Vec2|Vec3|Vec4|Mat2|Mat3|Mat4|number|boolean;
type UniformVariableType = UniformValueType | Texture | CubeMapTexture | (UniformValueType | Texture | CubeMapTexture)[];

class UniformValue {
    true_label:string
    value:UniformVariableType
    is_set:boolean = false
    constructor(true_label:string, value:UniformVariableType) {
        this.true_label = true_label;
        this.value = value;
    }
}

export class Uniform {
    shader_program:ShaderProgram
    label:string;
    type:WebGLUniformType;
    is_array:boolean;
    texture_unit?:number;

    values:{[true_label:string]:UniformValue} = {};
    transpose:boolean = false;
    warn:boolean = false;

    constructor(shader_program:ShaderProgram, label:string, type:WebGLUniformType, is_array:boolean, texture_unit?:number) {
        this.shader_program = shader_program;
        this.label = label;
        this.type = type;
        this.is_array = is_array;
        this.texture_unit = texture_unit;
    }

    set(label:string, value:UniformVariableType, transpose:boolean = false, warn:boolean = false) {
        this.values[label] = new UniformValue(label, value);
        this.transpose = transpose;
        this.warn = warn;
    }

    apply() {
        for (const value of Object.values(this.values)) {
            if (!value.is_set) {
                this.shader_program.write_uniform(value.true_label, value.value, this.transpose, this.warn);
                value.is_set = true;
            }
        }
    }
};