import { GraphicsManager } from "./graphics_manager";
import { get_uniform_label_index, normalize_uniform_label } from "./utility";
import { Members, MEMORY_USAGE_MODE, UniformBufferObject } from "./assets/uniform_buffer";
import { CubeMapTexture, Texture } from "./assets/texture";
import { Uniform, UniformValueType, WebGLUniformType } from "./assets/uniform";
import { Mat2, Mat3, Mat4, Vec2, Vec3 } from "@vicimpa/glm";

export type WebGLShaderType = number;



export class ShaderProgram {
    gl:WebGL2RenderingContext;
    gm:GraphicsManager;
    name:string;
    shaders:Array<WebGLShader> = [];
    webgl_shader_program:WebGLProgram|null = null;
    uniforms:{[key:string]:Uniform} = {};
    uniform_locs:{[key:string]:WebGLUniformLocation|null} = {};
    texture_counter:number = 0;
    ubos:{[key:string]:UniformBufferObject} = {}

    constructor(name:string, gm:GraphicsManager, gl:WebGL2RenderingContext) {
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

    set_uniform(label:string, value:UniformValueType | Texture | CubeMapTexture | (UniformValueType | Texture | CubeMapTexture)[], transpose:boolean = false, warn:boolean = false) {
        const normalized_label = normalize_uniform_label(label).replace("[]", "");

        if (Object.keys(this.uniforms).includes(normalized_label))
            this.uniforms[normalized_label].set(label, value, transpose, warn);
        else
            console.warn(`Uniform \"${normalized_label}\" does not exist or is not in use in the shader program \"${this.name}\"`);
    }

    write_uniform(label:string, value:UniformValueType | Texture | CubeMapTexture | (UniformValueType | Texture | CubeMapTexture)[], transpose:boolean = false, warn:boolean = false) {
        const gl = this.gl;
        
        const label_index = get_uniform_label_index(label);
        
        
        const normalized_label = normalize_uniform_label(label).replace("[]", "");
        
        let uniform = this.uniforms[normalized_label];
        if (uniform === undefined) {
            if (warn)
                console.warn(`The uniform "${label}" has not been registered for the shader program "${this.name}".`)
            return;
        }
        
        if (!(label in this.uniform_locs)) {
            const loc = this.gl.getUniformLocation(this.webgl_shader_program!, label);
            if (!loc) {
                if (warn)
                    console.warn(`Uniform "${label}" not in use in shader program "${this.name}".`)
            }
            this.uniform_locs[label] = loc;
        }

        // if (uniform.texture_unit !== undefined)
        //     console.log("UNIFORM ", normalized_label, " ", uniform.texture_unit! + label_index, "SHADER : ", this.shader_program.name);
        var is_sending_array = false;
        if (value instanceof Array) {
            if (uniform.is_array) {
                is_sending_array = true
            } else {
                throw Error(`Uniform "${label}" in shader program "${this.name}" does not accept array values even though one was supplied.`)
            }
        }

        // console.log(label);

        switch (uniform.type) {
            case WebGLUniformType.TEXTURE_2D:
            case WebGLUniformType.SHADOW_2D:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit! + label_index);
                this.gl.bindTexture(this.gl.TEXTURE_2D, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.uniform_locs[label], uniform.texture_unit! + label_index);
                break;
            case WebGLUniformType.TEXTURE_2D_ARRAY:
            case WebGLUniformType.SHADOW_2D_ARRAY:                
                this.gl.activeTexture(gl.TEXTURE0 + uniform.texture_unit! + label_index);
                this.gl.bindTexture(gl.TEXTURE_2D_ARRAY, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.uniform_locs[label], uniform.texture_unit! + label_index);
                break;

            case WebGLUniformType.SHADOW_CUBE_MAP:
            case WebGLUniformType.TEXTURE_CUBE_MAP:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit! + label_index);
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, (value as CubeMapTexture).webgl_texture);
                this.gl.uniform1i(this.uniform_locs[label], uniform.texture_unit! + label_index);
                break;

            case WebGLUniformType.F:
                if (is_sending_array) {
                    let flattened_value = GraphicsManager.flatten_uniform_array_value(value as Array);
                    this.gl.uniform1fv(this.uniform_locs[label], flattened_value);
                } else
                    this.gl.uniform1f(this.uniform_locs[label], value as number);
                break;

            case WebGLUniformType.I:
                if (is_sending_array) {
                    let flattened_value = GraphicsManager.flatten_uniform_array_value(value as Array);
                    this.gl.uniform1iv(this.uniform_locs[label], flattened_value);
                } else
                    this.gl.uniform1i(this.uniform_locs[label], value as number);
                break;

            case WebGLUniformType.B:
                if (is_sending_array) {
                    let flattened_value = GraphicsManager.flatten_uniform_array_value(value as Array);
                    this.gl.uniform1iv(this.uniform_locs[label], flattened_value);
                } else
                    this.gl.uniform1i(this.uniform_locs[label], value as boolean ? 1 : 0);
                break;

            case WebGLUniformType.F2V:
                this.gl.uniform2fv(this.uniform_locs[label], value as Vec2);
                break;

            case WebGLUniformType.I2V:
                this.gl.uniform2iv(this.uniform_locs[label], value as Vec2);
                break;

            case WebGLUniformType.F3V:
                this.gl.uniform3fv(this.uniform_locs[label], value as Vec3);
                break;

            case WebGLUniformType.I3V:
                this.gl.uniform3iv(this.uniform_locs[label], value as Vec3);
                break;

            case WebGLUniformType.F2M:
                this.gl.uniformMatrix2fv(this.uniform_locs[label], transpose, value as Mat2);
                break;

            case WebGLUniformType.F3M:
                this.gl.uniformMatrix3fv(this.uniform_locs[label], transpose, value as Mat3);
                break;
            
            case WebGLUniformType.F4M:
                this.gl.uniformMatrix4fv(this.uniform_locs[label], transpose, value as Mat4);
                break;
        }
    }

    apply_all_uniforms() {
        this.use(true)
        for (const uniform of Object.values(this.uniforms)) {
            uniform.apply();
        }
        for (const ubo of Object.values(this.ubos)) {
            ubo.apply(true);
        }
        this.gm.clear_shader()
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
        this.uniforms[label] = new Uniform(this, label, uniform_type, label_normalized.startsWith("[]"));
        

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

        // BUILD UBOS
        for (const ubo of Object.values(this.ubos)) {
            ubo.build();
        }

        this.use(true);
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

    use(bind:boolean = true) {
        this.gm.use_shader(this.name, bind);
    }

    cleanup() {
        for (const ubo of Object.values(this.ubos)) {
            ubo.cleanup();
        }
        for (const shader of this.shaders) {
            this.gl.deleteShader(shader)
        }
    }
}