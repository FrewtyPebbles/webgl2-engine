import { Vec3, Vec2, Mat4, Quat, Vec4 } from '@vicimpa/glm';
import { Node3D, Node } from '../node.ts';
import { CubeMapTexture, Texture, TextureType } from './assets.ts';
import Engine from '../engine.ts';
import { normalize_uniform_label } from './utility.ts';

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

const MAX_DELTA_TIME = 0.1; // 100 ms

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

export enum AttachmentType {
    TEXTURE_COLOR,
    TEXTURE_DEPTH,
    TEXTURE_STENCIL,
    TEXTURE_DEPTH_STENCIL
}

export interface AttachmentInfo {
    name:string;
    type:AttachmentType;
    mipmap_level?:number;
    texture_parameters?:{[key:number]:number};
}

export class Framebuffer {
    name:string;
    gl:WebGL2RenderingContext;
    gm:GraphicsManager;
    width:number;
    height:number;
    clear_color:Vec4;
    webgl_frame_buffer:WebGLFramebuffer;
    use_depth_buffer:boolean = false;
    textures:{[name:string]:Texture} = {};

    constructor(name:string, gm:GraphicsManager, gl:WebGL2RenderingContext, width:number, height:number, attachment_info:{[name:string]:AttachmentInfo}, clear_color:Vec4 = new Vec4(0,0,0,1)) {
        this.name = name
        this.gl = gl;
        this.gm = gm;
        this.name = name;
        this.width = width;
        this.height = height;
        this.clear_color = clear_color;
        this.webgl_frame_buffer = this.gl.createFramebuffer();

        let color_attachment_count = 0;

        let attachment_numbers:number[] = []

        for (const [attachment_name, attachment] of Object.entries(attachment_info)) {
            const is_depth_textures_attachment = attachment.type === AttachmentType.TEXTURE_DEPTH || 
                attachment.type === AttachmentType.TEXTURE_DEPTH_STENCIL;
            
            var tex_parameters:{[key:number]:number} = 
                attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
            tex_parameters[gl.TEXTURE_MIN_FILTER] = gl.LINEAR;
            tex_parameters[gl.TEXTURE_MAG_FILTER] = gl.LINEAR;
            tex_parameters[gl.TEXTURE_WRAP_S] = gl.CLAMP_TO_EDGE;
            tex_parameters[gl.TEXTURE_WRAP_T] = gl.CLAMP_TO_EDGE;
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.webgl_frame_buffer);
            if (is_depth_textures_attachment) {
                this.use_depth_buffer = true;

                this.textures[attachment_name] = new Texture(
                    this.gm,
                    this.width,
                    this.height,
                    TextureType.DEPTH,
                    tex_parameters
                );

                gl.framebufferTexture2D(
                    gl.FRAMEBUFFER,
                    gl.DEPTH_ATTACHMENT,
                    gl.TEXTURE_2D,
                    this.textures[attachment_name].webgl_texture,
                    attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
                );
            } else {
                const attachment_num = gl.COLOR_ATTACHMENT0 + color_attachment_count;

                this.textures[attachment_name] = new Texture(
                    this.gm,
                    this.width,
                    this.height,
                    TextureType.DEFAULT,
                    tex_parameters
                );
                
                gl.framebufferTexture2D(
                    gl.FRAMEBUFFER,
                    attachment_num,
                    gl.TEXTURE_2D,
                    this.textures[attachment_name].webgl_texture,
                    attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
                );

                attachment_numbers.push(attachment_num);
                color_attachment_count++;
            }
        }
        this.gl.drawBuffers(attachment_numbers);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw Error(`Framebuffer incomplete, STATUS = ${gl.checkFramebufferStatus(gl.FRAMEBUFFER)}`);
        }
    }

    use() {
        this.gm.use_framebuffer(this.name);
    }
}

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

            console.log(this.webgl_shader_program, label);
            
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

export class GraphicsManager {
    engine:Engine;
    canvas:HTMLCanvasElement;
    gl:WebGL2RenderingContext;
    shader_programs:{[key:string]:ShaderProgram} = {};
    shader_program:ShaderProgram|null = null;
    framebuffers:{[key:string]:Framebuffer} = {};
    framebuffer:Framebuffer|null = null;
    vertex_attributes:{[key:string]:WebGLVertexAttribute} = {};
    vertex_count:number = 0;

    prev_time:number = 0;

    constructor(engine:Engine, canvas:HTMLCanvasElement) {
        this.engine = engine;
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
        if (this.shader_program)
            this.clear_shader();
        this.shader_program = this.shader_programs[name];
        this.gl.useProgram(this.shader_program.webgl_shader_program);
    }

    clear_shader() {
        this.gl.useProgram(null);
        this.shader_program = null;
    }

    create_framebuffer(name:string, width:number, height:number, attachment_info:{ [name: string]: AttachmentInfo }) {
        const framebuffer = new Framebuffer(name, this, this.gl, width, height, attachment_info);
        this.framebuffers[name] = framebuffer;
        return framebuffer;
    }

    use_framebuffer(name:string) {
        if (this.framebuffer)
            this.unuse_framebuffer();
        this.framebuffer = this.framebuffers[name];
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer.webgl_frame_buffer);
        this.gl.viewport(0, 0, this.framebuffer.width, this.framebuffer.height);
        if (this.framebuffer.use_depth_buffer) {
            this.gl.enable(this.gl.DEPTH_TEST);
        }
        const cc = this.framebuffer.clear_color;
        this.gl.clearColor(cc.x, cc.y, cc.z, cc.w);
        this.gl.clear(
            this.gl.COLOR_BUFFER_BIT |
            (this.framebuffer.use_depth_buffer ? this.gl.DEPTH_BUFFER_BIT : 0)
        );
    }

    unuse_framebuffer() {
        if (!this.framebuffer)
            return;
        if (this.framebuffer.use_depth_buffer) {
            this.gl.disable(this.gl.DEPTH_TEST);
        }
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.framebuffer = null;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    set_uniform(label:string, value:any, transpose:boolean = false) {
        if (this.shader_program === null) {
            console.warn(`Attempted to set ${label} uniform value to ${value} before a shader program was selected.`)
            return;
        }

        const normalized_label = normalize_uniform_label(label);

        let uniform = this.shader_program.uniforms[normalized_label];
        if (uniform === undefined) {
            throw new Error(`The uniform "${label}" has not been registered for the shader program "${this.shader_program.name}".`)
        }
        
        if (!(label in this.shader_program.uniform_locs)) {
            const loc = this.gl.getUniformLocation(this.shader_program.webgl_shader_program!, label);
            if (!loc) {
                console.warn(`Uniform "${label}" not in use in shader program "${this.shader_program.name}".`)
            }
            this.shader_program.uniform_locs[label] = loc;
        }
        
        switch (uniform.type) {
            case WebGLUniformType.TEXTURE_2D:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit!);
                this.gl.bindTexture(this.gl.TEXTURE_2D, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit!);
                break;

            case WebGLUniformType.TEXTURE_CUBE_MAP:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit!);
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, (value as CubeMapTexture).texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit!);
                break;

            case WebGLUniformType.F:
                this.gl.uniform1f(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.I:
                this.gl.uniform1i(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.B:
                this.gl.uniform1i(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.F2V:
                this.gl.uniform2fv(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.I2V:
                this.gl.uniform2iv(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.F3V:
                this.gl.uniform3fv(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.I3V:
                this.gl.uniform3iv(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.F2M:
                this.gl.uniformMatrix2fv(this.shader_program.uniform_locs[label], transpose, value);
                break;

            case WebGLUniformType.F3M:
                this.gl.uniformMatrix3fv(this.shader_program.uniform_locs[label], transpose, value);
                break;
            
            case WebGLUniformType.F4M:
                this.gl.uniformMatrix4fv(this.shader_program.uniform_locs[label], transpose, value);
                break;
        }
    }

    private resize_canvas() {
        const dpr = window.devicePixelRatio || 1;

        const displayWidth  = Math.floor(this.canvas.clientWidth  * dpr);
        const displayHeight = Math.floor(this.canvas.clientHeight * dpr);

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width  = displayWidth;
            this.canvas.height = displayHeight;
        }
    }



    render(update_callback:(gm:GraphicsManager, time:number, delta_time:number)=>void) {
        // start the recursive render frame loop.
        this.render_frame(update_callback);
    }

    private render_frame(update_callback:(gm:GraphicsManager, time:number, delta_time:number)=>void, time:number = 0):number {
        const delta_time = Math.min((time - this.prev_time) * 0.001, MAX_DELTA_TIME); // ms to seconds
        this.prev_time = time;
        update_callback(this, time, delta_time);
        
        this.resize_canvas();
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);        

        // Render node heirarchy.
        const ortho_projection = (new Mat4()).orthoNO(0, this.canvas.width, 0, this.canvas.height, -1, 1);
        this.engine.root_node.render(
            this.engine.main_camera.get_view_matrix(),
            this.engine.main_camera.get_projection_matrix(this.canvas),
            ortho_projection,
            time, delta_time
        );
        
        return requestAnimationFrame((new_time)=>{return this.render_frame(update_callback, new_time);});
    }
}
