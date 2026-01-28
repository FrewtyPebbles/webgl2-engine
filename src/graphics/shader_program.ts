import { GraphicsManager } from "./graphics_manager.ts";
import { normalize_uniform_label } from "./utility.ts";

export type WebGLShaderType = number;

export enum WebGLUniformType {
    TEXTURE_2D,
    TEXTURE_CUBE_MAP,
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
    texture_unit?:number;
};

export class ShaderProgram {
    gl:WebGLRenderingContext;
    gm:GraphicsManager;
    name:string;
    shaders:Array<WebGLShader> = [];
    webgl_shader_program:WebGLProgram|null = null;
    uniforms:{[key:string]:WebGLUniform} = {};
    uniform_locs:{[key:string]:WebGLUniformLocation|null} = {};
    texture_counter:number = 0;

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
        label = normalize_uniform_label(label);
        this.uniforms[label] = {
            label,
            type:uniform_type,
        }

        if (uniform_type === WebGLUniformType.TEXTURE_2D || uniform_type === WebGLUniformType.TEXTURE_CUBE_MAP) {
            this.uniforms[label].texture_unit = this.texture_counter;
            this.texture_counter += 1;
        }
    }

    build() {
        this.webgl_shader_program = this.gl.createProgram()!;
        
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
            if (label.startsWith("[]"))
                continue;
            
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