import { Vec3, Vec2, Mat4, Quat, Vec4 } from '@vicimpa/glm';
import { Node3D, Node } from '../node.ts';
import Engine from '../engine.ts';
import { normalize_uniform_label } from './utility.ts';
import { ShaderProgram, WebGLUniformType } from './shader_program.ts';
import { AttachmentInfo, AttachmentType, Framebuffer } from './framebuffer.ts';
import { CubeMapTexture, Texture } from './assets/texture.ts';

import DEFAULT_2D_VERTEX_SHADER from '../shaders/default_2d.vs.ts';
import DEFAULT_2D_FRAGMENT_SHADER from '../shaders/default_2d.fs.ts';

import DEFAULT_3D_VERTEX_SHADER from '../shaders/default_3d.vs.ts';
import DEFAULT_3D_FRAGMENT_SHADER from '../shaders/default_3d.fs.ts';

import DEFAULT_SKYBOX_VERTEX_SHADER from '../shaders/default_skybox.vs.ts';
import DEFAULT_SKYBOX_FRAGMENT_SHADER from '../shaders/default_skybox.fs.ts';

import DEFAULT_DIRECTIONAL_SHADOW_VERTEX_SHADER from "../shaders/default_directional_shadow.vs.ts";
import DEFAULT_DIRECTIONAL_SHADOW_FRAGMENT_SHADER from "../shaders/default_directional_shadow.fs.ts";

export type WebGLType = number;

const MAX_DELTA_TIME = 0.1; // 100 ms

export interface WebGLVertexAttribute {
    label:string;
    attribute_type:WebGLType;
    size:number;
    normalized:boolean;
    dynamic:boolean;
    vertex_buffer:WebGLBuffer;
};

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
    
    // DEFAULT SHADERS
    default_2d_shader_program:ShaderProgram;
    default_3d_shader_program:ShaderProgram;
    default_skybox_shader_program:ShaderProgram;
    
    constructor(engine:Engine, canvas:HTMLCanvasElement) {
        this.engine = engine;
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2", {
            colorSpace: 'srgb',
            antialias: true
        })! as WebGL2RenderingContext;

        this.default_2d_shader_program = this.create_default_2d_shader_program();
        this.default_3d_shader_program = this.create_default_3d_shader_program();
        this.default_skybox_shader_program = this.create_default_skybox_shader_program();
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

    create_framebuffer(name:string, width:number, height:number, attachment_info:AttachmentInfo[]) {
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
            this.gl.clearDepth(1.0);
            this.gl.depthMask(true);
            this.gl.depthFunc(this.gl.LESS);
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

    set_uniform(label:string, value:any, transpose:boolean = false, warn:boolean = false) {
        if (this.shader_program === null) {
            if (warn)
                console.warn(`Attempted to set ${label} uniform value to ${value} before a shader program was selected.`)
            return;
        }

        const normalized_label = normalize_uniform_label(label);

        let uniform = this.shader_program.uniforms[normalized_label];
        if (uniform === undefined) {
            if (warn)
                console.warn(`The uniform "${label}" has not been registered for the shader program "${this.shader_program.name}".`)
            return;
        }
        
        if (!(label in this.shader_program.uniform_locs)) {
            const loc = this.gl.getUniformLocation(this.shader_program.webgl_shader_program!, label);
            if (!loc) {
                if (warn)
                    console.warn(`Uniform "${label}" not in use in shader program "${this.shader_program.name}".`)
            }
            this.shader_program.uniform_locs[label] = loc;
        }        
        switch (uniform.type) {
            case WebGLUniformType.TEXTURE_2D:
            case WebGLUniformType.SHADOW_2D:
                // console.log("TU TEXTURE_2D | SHADOW_2D", uniform.texture_unit);

                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit!);
                this.gl.bindTexture(this.gl.TEXTURE_2D, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit!);
                break;
            case WebGLUniformType.TEXTURE_2D_ARRAY:
            case WebGLUniformType.SHADOW_2D_ARRAY:
                // console.log("TU TEXTURE_2D_ARRAY | SHADOW_2D_ARRAY", uniform.texture_unit);

                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit!);
                this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit!);
                break;

            case WebGLUniformType.TEXTURE_CUBE_MAP:
                // console.log("TU TEXTURE_CUBE_MAP", uniform.texture_unit);

                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit!);
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, (value as CubeMapTexture).webgl_texture);
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
        if (this.engine.main_scene.main_camera_3d) {
            this.engine.main_scene.render(
                this.engine.main_scene.main_camera_3d.get_view_matrix(),
                this.engine.main_scene.main_camera_3d.get_projection_matrix(this.canvas),
                ortho_projection,
                time, delta_time
            );
        } else {
            console.warn(`The main scene "${this.engine.main_scene.name}" does not have a main camera 3D`);
        }
        
        return requestAnimationFrame((new_time)=>{return this.render_frame(update_callback, new_time);});
    }

    create_default_2d_shader_program():ShaderProgram {
        const shader_prog_2d = this.create_shader_program("2D");

        shader_prog_2d.add_shader(this.gl.VERTEX_SHADER, DEFAULT_2D_VERTEX_SHADER);
        shader_prog_2d.add_shader(this.gl.FRAGMENT_SHADER, DEFAULT_2D_FRAGMENT_SHADER);

        shader_prog_2d.add_uniform("u_model", WebGLUniformType.F4M);
        shader_prog_2d.add_uniform("u_projection", WebGLUniformType.F4M);

        shader_prog_2d.add_uniform("sprite_texture", WebGLUniformType.TEXTURE_2D);

        shader_prog_2d.build();

        return shader_prog_2d;
    }

    create_default_3d_shader_program():ShaderProgram {

        const shader_prog_3d = this.create_shader_program("3D");

        shader_prog_3d.add_shader(this.gl.VERTEX_SHADER, DEFAULT_3D_VERTEX_SHADER);
        shader_prog_3d.add_shader(this.gl.FRAGMENT_SHADER, DEFAULT_3D_FRAGMENT_SHADER);

        // utility
        shader_prog_3d.add_uniform("time", WebGLUniformType.F);

        // SHADOWS
        shader_prog_3d.add_uniform("depth_cubemap", WebGLUniformType.TEXTURE_CUBE_MAP);

        // MVP
        shader_prog_3d.add_uniform("u_model", WebGLUniformType.F4M);
        shader_prog_3d.add_uniform("u_view", WebGLUniformType.F4M);
        shader_prog_3d.add_uniform("u_projection", WebGLUniformType.F4M);

        // environment
        shader_prog_3d.add_uniform("environment.ambient_light", WebGLUniformType.F3V);

        // camera
        shader_prog_3d.add_uniform("camera_position", WebGLUniformType.F3V);

        // lights
        shader_prog_3d.add_uniform("point_lights_count", WebGLUniformType.I);
        shader_prog_3d.add_uniform("spot_lights_count", WebGLUniformType.I);
        shader_prog_3d.add_uniform("directional_lights_count", WebGLUniformType.I);

        /// point lights
        shader_prog_3d.add_uniform("point_lights[].position", WebGLUniformType.F3V);
        shader_prog_3d.add_uniform("point_lights[].color", WebGLUniformType.F3V);
        shader_prog_3d.add_uniform("point_lights[].range", WebGLUniformType.F);
        shader_prog_3d.add_uniform("point_lights[].energy", WebGLUniformType.F);
        shader_prog_3d.add_uniform("point_lights[].ambient", WebGLUniformType.F);
        shader_prog_3d.add_uniform("point_lights[].diffuse", WebGLUniformType.F);
        shader_prog_3d.add_uniform("point_lights[].specular", WebGLUniformType.F);

        /// spot lights
        shader_prog_3d.add_uniform("spot_lights[].position", WebGLUniformType.F3V);
        shader_prog_3d.add_uniform("spot_lights[].color", WebGLUniformType.F3V);
        shader_prog_3d.add_uniform("spot_lights[].rotation", WebGLUniformType.F4M);
        shader_prog_3d.add_uniform("spot_lights[].range", WebGLUniformType.F);
        shader_prog_3d.add_uniform("spot_lights[].energy", WebGLUniformType.F);
        shader_prog_3d.add_uniform("spot_lights[].cookie_radius", WebGLUniformType.F);
        shader_prog_3d.add_uniform("spot_lights[].ambient", WebGLUniformType.F);
        shader_prog_3d.add_uniform("spot_lights[].diffuse", WebGLUniformType.F);
        shader_prog_3d.add_uniform("spot_lights[].specular", WebGLUniformType.F);

        /// directional lights
        shader_prog_3d.add_uniform("directional_lights[].rotation", WebGLUniformType.F4M);
        shader_prog_3d.add_uniform("directional_lights[].color", WebGLUniformType.F3V);
        shader_prog_3d.add_uniform("directional_lights[].energy", WebGLUniformType.F);
        shader_prog_3d.add_uniform("directional_lights[].ambient", WebGLUniformType.F);
        shader_prog_3d.add_uniform("directional_lights[].diffuse", WebGLUniformType.F);
        shader_prog_3d.add_uniform("directional_lights[].specular", WebGLUniformType.F);

        // material
        shader_prog_3d.add_uniform("material.has_normal_texture", WebGLUniformType.B);
        shader_prog_3d.add_uniform("material.has_albedo_texture", WebGLUniformType.B);
        shader_prog_3d.add_uniform("material.albedo", WebGLUniformType.F3V);
        shader_prog_3d.add_uniform("material.has_metalic_texture", WebGLUniformType.B);
        shader_prog_3d.add_uniform("material.metalic", WebGLUniformType.F);
        shader_prog_3d.add_uniform("material.has_roughness_texture", WebGLUniformType.B);
        shader_prog_3d.add_uniform("material.roughness", WebGLUniformType.F);
        shader_prog_3d.add_uniform("material.has_ao_texture", WebGLUniformType.B);
        shader_prog_3d.add_uniform("material.ao", WebGLUniformType.F);

        shader_prog_3d.add_uniform("material_texture_albedo", WebGLUniformType.TEXTURE_2D);
        shader_prog_3d.add_uniform("material_texture_normal", WebGLUniformType.TEXTURE_2D);
        shader_prog_3d.add_uniform("material_texture_metalic", WebGLUniformType.TEXTURE_2D);
        shader_prog_3d.add_uniform("material_texture_roughness", WebGLUniformType.TEXTURE_2D);
        shader_prog_3d.add_uniform("material_texture_ao", WebGLUniformType.TEXTURE_2D);
        
        // shadows
        shader_prog_3d.add_uniform("u_directional_light_space_matrix[]", WebGLUniformType.F4M);
        shader_prog_3d.add_uniform("directional_light_shadow_map", WebGLUniformType.SHADOW_2D_ARRAY);
        shader_prog_3d.add_uniform("shadow_map_size", WebGLUniformType.F2V)

        shader_prog_3d.build();

        return shader_prog_3d;
    }

    create_default_skybox_shader_program() {
        const shader_prog_skybox = this.create_shader_program("SKYBOX");

        shader_prog_skybox.add_shader(this.gl.VERTEX_SHADER, DEFAULT_SKYBOX_VERTEX_SHADER);
        shader_prog_skybox.add_shader(this.gl.FRAGMENT_SHADER, DEFAULT_SKYBOX_FRAGMENT_SHADER);

        shader_prog_skybox.add_uniform("u_view", WebGLUniformType.F4M);
        shader_prog_skybox.add_uniform("u_projection", WebGLUniformType.F4M);

        shader_prog_skybox.add_uniform("skybox_texture", WebGLUniformType.TEXTURE_CUBE_MAP);

        shader_prog_skybox.build();

        return shader_prog_skybox;
    }

    create_default_directional_shadow_shader_program():ShaderProgram {
        const sp = this.create_shader_program("default_directional_shadow_shader_program");

        sp.add_shader(this.gl.VERTEX_SHADER, DEFAULT_DIRECTIONAL_SHADOW_VERTEX_SHADER);
        sp.add_shader(this.gl.FRAGMENT_SHADER, DEFAULT_DIRECTIONAL_SHADOW_FRAGMENT_SHADER);

        sp.add_uniform("u_light_space_matrix", WebGLUniformType.F4M);
        sp.add_uniform("u_model", WebGLUniformType.F4M);

        sp.build()

        return sp;
    }
}
