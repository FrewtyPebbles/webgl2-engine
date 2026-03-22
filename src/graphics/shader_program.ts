import { GraphicsManager } from "./graphics_manager";
import { get_uniform_label_index, normalize_uniform_label } from "./utility";

export type WebGLShaderType = number;

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

export interface WebGLUniform {
    label:string;
    type:WebGLUniformType;
    is_array:boolean;
    texture_unit?:number;
};

interface UBOParameter {
    label: string;
    index: number;
    offset: number;
}

interface UBOBase {
    webgl_buffer: WebGLBuffer;
}

interface UBOParameters {
    [parameter:string]: UBOParameter;
}

export type UBO = UBOBase & UBOParameters;

export class ShaderProgram {
    gl:WebGLRenderingContext;
    gm:GraphicsManager;
    name:string;
    shaders:Array<WebGLShader> = [];
    webgl_shader_program:WebGLProgram|null = null;
    uniforms:{[key:string]:WebGLUniform} = {};
    uniform_locs:{[key:string]:WebGLUniformLocation|null} = {};
    texture_counter:number = 0;
    ubo_counter:number = 0;
    ubos:{[location:string]:UBO} = {}

    constructor(name:string, gm:GraphicsManager, gl:WebGLRenderingContext) {
        this.gm = gm;
        this.gl = gl;
        this.name = name;
    }

    add_shader(type: WebGLShaderType, source: string) {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(shader));
        }
        this.shaders.push(shader);
    }

    add_uniform(label:string, uniform_type:WebGLUniformType) {
        const uniform_size = Math.max(1, get_uniform_label_index(label));
        let label_normalized = normalize_uniform_label(label);
        label = label_normalized.replace("[]", "");
        this.uniforms[label] = {
            label,
            type:uniform_type,
            is_array:label_normalized.startsWith("[]")
        }
        

        if ([
            WebGLUniformType.TEXTURE_2D,
            WebGLUniformType.TEXTURE_2D_ARRAY,
            WebGLUniformType.TEXTURE_CUBE_MAP,
            WebGLUniformType.SHADOW_2D,
            WebGLUniformType.SHADOW_2D_ARRAY,
            WebGLUniformType.SHADOW_CUBE_MAP,
        ].includes(uniform_type)) {
            this.uniforms[label].texture_unit = this.texture_counter;
            
            this.texture_counter += uniform_size;
        }
    }

    build() {
        this.webgl_shader_program = this.gl.createProgram();
        
        for (let shader of this.shaders) {
            this.gl.attachShader(this.webgl_shader_program, shader);
        }
        
        this.gl.linkProgram(this.webgl_shader_program);
        if (!this.gl.getProgramParameter(this.webgl_shader_program, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(this.webgl_shader_program));
        }

        this.use();
        // find uniform locs

        for (let [label, uniform] of Object.entries(this.uniforms)) {
            
            const loc = this.gl.getUniformLocation(this.webgl_shader_program!, label);
            if (!loc) {
                console.warn(`Uniform "${label}" not in use in shader program "${this.name}".`)
            }

            this.uniform_locs[label] = loc;
        }

        this.gm.clear_shader();
    }

    use() {
        this.gm.use_shader(this.name);
    }
}