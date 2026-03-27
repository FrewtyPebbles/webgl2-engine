import { GraphicsManager } from "./graphics_manager";
import { get_uniform_label_index, normalize_uniform_label } from "./utility";
import { Members, MEMORY_USAGE_MODE, UniformBufferObject, WebGLUniformType } from "./assets/uniform_buffer";

export type WebGLShaderType = number;

export interface WebGLUniform {
    label:string;
    type:WebGLUniformType;
    is_array:boolean;
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
    ubos:{[key:string]:UniformBufferObject} = {}

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

    add_ubo(name:string, members:Members, memory_usage_mode:MEMORY_USAGE_MODE = MEMORY_USAGE_MODE.DYNAMIC_DRAW) {
        this.ubos[name] = new UniformBufferObject(this, name, members, memory_usage_mode);
    }

    set_ubo_member(ubo_name:string, name:string, value:any, bind:boolean = false) {
        this.ubos[ubo_name].set_uniform(name, value, bind);
    }

    bind_ubo(name:string) {
        this.ubos[name].bind();
    }

    unbind_ubo(name:string) {
        this.ubos[name].unbind();
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

    cleanup() {
        for (const shader of this.shaders) {
            this.gl.deleteShader(shader)
        }
    }
}