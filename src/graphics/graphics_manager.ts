import { Vec3, Vec2, Mat4, Quat } from '@vicimpa/glm';
import { Node3D, Node } from './node';
import { Camera3D } from './node_extensions';
import { Texture } from './assets';

// passthrough
export const DEFAULT_VERTEX = `
    attribute vec2 a_position;
    attribute vec2 a_texcoord;
    varying vec2 v_texcoord;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texcoord = a_texcoord;
    }
`;

export const DEFAULT_FRAGMENT = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texcoord;

    void main() {
        vec4 color = texture2D(u_texture, v_texcoord);
        gl_FragColor = color;
    }
`;

export type WebGLShaderType = number;
export type WebGLType = number;

export interface WebGLVertexAttribute {
    label:string;
    attribute_type:WebGLType;
    size:number;
    normalized:boolean;
    dynamic:boolean;
    vertex_buffer:WebGLBuffer;
};

export enum WebGLUniformType {
    TEXTURE_2D,
    F,
    I,
    F2V,
    I2V,
    F3V,
    I3V,
    F4V,
    I4V,
    F2M,
    F3M,
    F4M
}

export interface WebGLUniform {
    label:string;
    loc:WebGLUniformLocation|null;
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
        this.uniforms[label] = {
            label,
            loc:null,
            type:uniform_type
        }
        if (uniform_type == WebGLUniformType.TEXTURE_2D) {
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
            uniform.loc = this.gl.getUniformLocation(this.webgl_shader_program!, label);
        }
        this.gm.clear_shader();
    }

    use() {
        this.gm.use_shader(this.name);
    }
}

export default class GraphicsManager {
    canvas:HTMLCanvasElement;
    gl:WebGL2RenderingContext;
    shader_programs:{[key:string]:ShaderProgram} = {};
    vertex_attributes:{[key:string]:WebGLVertexAttribute} = {};
    vertex_count:number = 0;
    shader_program:ShaderProgram|null = null;

    // Node Heirarchy
    root_node:Node = new Node();
    main_camera:Camera3D = new Camera3D();

    constructor(canvas:HTMLCanvasElement) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2")! as WebGL2RenderingContext;
    }

    webgl_enabled():boolean {
        return this.gl !== null;
    }

    add_vertex_attribute(label:string, attribute_type:WebGLType, size:number, initial_data:Float32Array, normalized:boolean = false, dynamic:boolean = false) {
        if (!this.shader_program) {
            console.warn(`Tried to add ${label} vertex attribute without a shader bound while loading mesh.`)
            return
        }
        let vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, initial_data, dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW);
        const texcoordLoc = this.gl.getAttribLocation(this.shader_program!, label);
        this.gl.enableVertexAttribArray(texcoordLoc);
        this.gl.vertexAttribPointer(texcoordLoc, size, attribute_type, normalized, 0, 0);

        this.vertex_attributes[label] = {
            label,
            attribute_type,
            size,
            normalized,
            dynamic,
            vertex_buffer:vertexBuffer
        };
        this.vertex_count = initial_data.length / this.vertex_attributes[label].size;
    }

    remove_vertex_attribute(label:string) {
        this.gl.deleteBuffer(this.vertex_attributes[label].vertex_buffer);
    }

    set_vertex_attribute_data(label:string, data:Float32Array, offset:number = 0) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_attributes[label].vertex_buffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
        this.vertex_count = data.length / this.vertex_attributes[label].size;
    }

    create_shader_program(name:string) {
        const prog = new ShaderProgram(name, this, this.gl);
        this.shader_programs[name] = prog;
        return prog;
    }

    use_shader(name:string) {
        this.shader_program = this.shader_programs[name];
        this.gl.useProgram(this.shader_program.webgl_shader_program);
    }

    clear_shader() {
        this.gl.useProgram(null);
        this.shader_program = null;
    }

    set_uniform(label:string, value:any, transpose:boolean = false) {
        if (this.shader_program === null) {
            console.warn(`Attempted to set ${label} uniform value to ${value} before a shader program was selected.`)
            return;
        }
        let uniform = this.shader_program.uniforms[label];
        if (uniform.loc === null) {
            uniform.loc = this.gl.getUniformLocation(this.shader_program.webgl_shader_program!, label);
        }
        switch (uniform.type) {
            case WebGLUniformType.TEXTURE_2D:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit!);
                this.gl.bindTexture(this.gl.TEXTURE_2D, (value as Texture).texture);
                this.gl.uniform1i(uniform.loc!, uniform.texture_unit!);
                break;

            case WebGLUniformType.F:
                this.gl.uniform1f(uniform.loc!, value);
                break;

            case WebGLUniformType.I:
                this.gl.uniform1i(uniform.loc!, value);
                break;

            case WebGLUniformType.F2V:
                this.gl.uniform2fv(uniform.loc!, value);
                break;

            case WebGLUniformType.I2V:
                this.gl.uniform2iv(uniform.loc!, value);
                break;

            case WebGLUniformType.F3V:
                this.gl.uniform3fv(uniform.loc!, value);
                break;

            case WebGLUniformType.I3V:
                this.gl.uniform3iv(uniform.loc!, value);
                break;

            case WebGLUniformType.F2M:
                this.gl.uniformMatrix2fv(uniform.loc!, transpose, value);
                break;

            case WebGLUniformType.F3M:
                this.gl.uniformMatrix3fv(uniform.loc!, transpose, value);
                break;
            
            case WebGLUniformType.F4M:
                this.gl.uniformMatrix4fv(uniform.loc!, transpose, value);
                break;
        
            default:
                break;
        }
    }

    render(callback:(gm:GraphicsManager)=>void):number {
        callback(this);
        
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);        

        // Render node heirarchy.
        const ortho_projection = (new Mat4()).orthoNO(0, this.canvas.width, 0, this.canvas.height, -1, 1);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.root_node.render(this.main_camera.get_view_matrix(), this.main_camera.get_projection_matrix(this.canvas), ortho_projection);
        
        return requestAnimationFrame(()=>{return this.render(callback);});
    }
}
