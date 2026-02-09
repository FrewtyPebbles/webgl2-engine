import { Vec3, Vec2, Mat4, Quat, Vec4, Mat2, Mat3 } from '@vicimpa/glm';
import { Node3D, Node } from '../node.ts';
import Engine from '../engine.ts';
import { get_uniform_label_index, normalize_uniform_label } from './utility.ts';
import { ShaderProgram, WebGLUniformType } from './shader_program.ts';
import { AttachmentInfo, AttachmentType, DrawBitFlags, DrawFlag, Framebuffer, has_flag } from './framebuffer.ts';
import { CubeMapTexture, Texture, TextureType } from './assets/texture.ts';

import DEFAULT_2D_VERTEX_SHADER from '../shaders/default_2d.vs.ts';
import DEFAULT_2D_FRAGMENT_SHADER from '../shaders/default_2d.fs.ts';

import DEFAULT_3D_VERTEX_SHADER from '../shaders/default_3d.vs.ts';
import DEFAULT_3D_FRAGMENT_SHADER from '../shaders/default_3d.fs.ts';

import DEFAULT_SKYBOX_VERTEX_SHADER from '../shaders/default_skybox.vs.ts';
import DEFAULT_SKYBOX_FRAGMENT_SHADER from '../shaders/default_skybox.fs.ts';

import DEFAULT_DIRECTIONAL_SHADOW_VERTEX_SHADER from "../shaders/default_directional_shadow.vs.ts";
import DEFAULT_DIRECTIONAL_SHADOW_FRAGMENT_SHADER from "../shaders/default_directional_shadow.fs.ts";

import DEFAULT_POINT_SHADOW_VERTEX_SHADER from "../shaders/default_point_shadow.vs.ts";
import DEFAULT_POINT_SHADOW_FRAGMENT_SHADER from "../shaders/default_point_shadow.fs.ts";
import { PointLight } from '../node/lights/point_light.ts';
import { DirectionalLight } from '../node/lights/directional_light.ts';
import { SpotLight } from '../node/lights/spot_light.ts';

export type WebGLType = number;

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
    
    private last_frame_time: number | null = null;
    
    // DEFAULT SHADERS
    default_2d_shader_program:ShaderProgram;
    default_3d_shader_program:ShaderProgram;
    default_skybox_shader_program:ShaderProgram;

    // LIGHTS
    point_lights:PointLight[] = [];
    directional_lights:DirectionalLight[] = [];
    spot_lights:SpotLight[] = [];

    // SHADOWS
    directional_light_shadow_map_texture:Texture;
    point_light_shadow_map_texture:Texture;
    point_shadow_depth_buffer:Framebuffer;
    directional_shadow_depth_buffer:Framebuffer;
    shadow_resolution:number = 1024 * 6;
    
    constructor(engine:Engine, canvas:HTMLCanvasElement) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2", {
            colorSpace: 'srgb',
            antialias: true
        })! as WebGL2RenderingContext;
        this.engine = engine;

        this.default_2d_shader_program = this.create_default_2d_shader_program();
        this.default_3d_shader_program = this.create_default_3d_shader_program();
        this.default_skybox_shader_program = this.create_default_skybox_shader_program();

        this.directional_light_shadow_map_texture = new Texture(
            this,
            "directional_light_shadow_map_texture",
            Math.max(1, this.directional_lights.length),
            this.shadow_resolution,
            this.shadow_resolution,
            TextureType.DEPTH_ARRAY,
            {
                [this.gl.TEXTURE_COMPARE_MODE]: this.gl.COMPARE_REF_TO_TEXTURE,
                [this.gl.TEXTURE_COMPARE_FUNC]: this.gl.LEQUAL,
                [this.gl.TEXTURE_MIN_FILTER]: this.gl.LINEAR,
                [this.gl.TEXTURE_MAG_FILTER]: this.gl.LINEAR,
                [this.gl.TEXTURE_WRAP_S]: this.gl.CLAMP_TO_EDGE,
                [this.gl.TEXTURE_WRAP_T]: this.gl.CLAMP_TO_EDGE,
                [this.gl.TEXTURE_BASE_LEVEL]: 0,
                [this.gl.TEXTURE_MAX_LEVEL]: 0,
            }
        );

        this.point_light_shadow_map_texture = new Texture(
            this,
            "point_light_shadow_map_texture",
            Math.max(1, this.point_lights.length) * 6,
            this.shadow_resolution/6,
            this.shadow_resolution/6,
            TextureType.DEPTH_ARRAY,
            {
                [this.gl.TEXTURE_COMPARE_MODE]: this.gl.COMPARE_REF_TO_TEXTURE,
                [this.gl.TEXTURE_COMPARE_FUNC]: this.gl.LEQUAL,
                [this.gl.TEXTURE_MIN_FILTER]: this.gl.LINEAR,
                [this.gl.TEXTURE_MAG_FILTER]: this.gl.LINEAR,
                [this.gl.TEXTURE_WRAP_S]: this.gl.CLAMP_TO_EDGE,
                [this.gl.TEXTURE_WRAP_T]: this.gl.CLAMP_TO_EDGE,
                [this.gl.TEXTURE_BASE_LEVEL]: 0,
                [this.gl.TEXTURE_MAX_LEVEL]: 0,
            }
        );

        this.point_shadow_depth_buffer = this.create_framebuffer(
            `point_shadow_depth_buffer`,
            [
                {
                    name:"depth",
                    type:AttachmentType.TEXTURE_ARRAY_DEPTH,
                    texture:this.point_light_shadow_map_texture,
                    texture_array_index:this.point_lights.length * 6
                }
            ],
              DrawFlag.DEPTH_TEST
            | DrawFlag.DEPTH_FUNC_LESS
            | DrawFlag.CULL_FRONT
            | DrawFlag.FORCE_WRITE_DEPTH
        );

        this.directional_shadow_depth_buffer = this.create_framebuffer(
            `directional_shadow_depth_buffer`,
            [
                {
                    name:"depth",
                    type:AttachmentType.TEXTURE_ARRAY_DEPTH,
                    texture:this.directional_light_shadow_map_texture,
                    texture_array_index:this.directional_lights.length
                }
            ],
              DrawFlag.DEPTH_TEST
            | DrawFlag.DEPTH_FUNC_LESS
            | DrawFlag.CULL_FRONT
        );
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
        // console.log(`USING SHADER ${this.shader_program.name}`);
        
    }

    clear_shader() {
        this.gl.useProgram(null);
        this.shader_program = null;
    }

    create_framebuffer(name:string, attachment_info:AttachmentInfo[], draw_flags:DrawBitFlags) {
        const framebuffer = new Framebuffer(name, this, this.gl, attachment_info, draw_flags);
        this.framebuffers[name] = framebuffer;
        return framebuffer;
    }

    use_framebuffer(name:string) {
        const framebuffer = this.framebuffers[name];
        if (this.framebuffer === framebuffer)
            return;
        
        this.framebuffer = framebuffer;
        const draw_flags = framebuffer.draw_flags;
        const gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.webgl_frame_buffer);
        gl.viewport(0, 0, framebuffer.width, framebuffer.height);
        if (has_flag(draw_flags, DrawFlag.DEPTH_TEST)) {
            gl.enable(gl.DEPTH_TEST);            
        }
        
        if (has_flag(draw_flags, DrawFlag.CULL_FRONT)) {
            gl.cullFace(gl.FRONT);
        } else if (has_flag(draw_flags, DrawFlag.CULL_BACK)) {
            gl.cullFace(gl.FRONT);
        } else if (has_flag(draw_flags, DrawFlag.CULL_FRONT_AND_BACK)) {
            gl.cullFace(gl.FRONT_AND_BACK);
        }

        if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_LESS)) {
            gl.depthFunc(gl.LESS);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_NEVER)) {
            gl.depthFunc(gl.NEVER);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_EQUAL)) {
            gl.depthFunc(gl.EQUAL);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_LESS_EQUAL)) {
            gl.depthFunc(gl.LEQUAL);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_GREATER)) {
            gl.depthFunc(gl.GREATER);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_NOT_EQUAL)) {
            gl.depthFunc(gl.NOTEQUAL);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_GREATER_EQUAL)) {
            gl.depthFunc(gl.GEQUAL);
        } else if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_ALWAYS)) {
            gl.depthFunc(gl.ALWAYS);
        }
        
        if (framebuffer.use_depth_buffer || has_flag(draw_flags, DrawFlag.FORCE_WRITE_DEPTH)) {
            gl.clearDepth(1.0);
            gl.depthMask(true);
        }
    }

    unuse_framebuffer() {
        if (!this.framebuffer)
            return;

        const framebuffer = this.framebuffer;
        const draw_flags = framebuffer.draw_flags;
        const gl = this.gl;

        if (draw_flags & DrawFlag.DEPTH_TEST) {
            gl.disable(gl.DEPTH_TEST);
        }
        if (has_flag(draw_flags, DrawFlag.DEPTH_FUNC_NEVER)
         || has_flag(draw_flags, DrawFlag.DEPTH_FUNC_EQUAL)
         || has_flag(draw_flags, DrawFlag.DEPTH_FUNC_LESS_EQUAL)
         || has_flag(draw_flags, DrawFlag.DEPTH_FUNC_GREATER)
         || has_flag(draw_flags, DrawFlag.DEPTH_FUNC_NOT_EQUAL)
         || has_flag(draw_flags, DrawFlag.DEPTH_FUNC_GREATER_EQUAL)
         || has_flag(draw_flags, DrawFlag.DEPTH_FUNC_ALWAYS)) {
            gl.depthFunc(gl.LESS);
        }
        if (
            has_flag(draw_flags, DrawFlag.CULL_FRONT)
         || has_flag(draw_flags, DrawFlag.CULL_BACK)
         || has_flag(draw_flags, DrawFlag.CULL_FRONT_AND_BACK)
        ) {
            gl.cullFace(gl.BACK);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.framebuffer = null;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    set_uniform(label:string, value:any, transpose:boolean = false, warn:boolean = false) {
        
        
        if (this.shader_program === null) {
            if (warn)
                console.warn(`Attempted to set ${label} uniform value to ${value} before a shader program was selected.`)
            return;
        }
        
        const label_index = get_uniform_label_index(label);
        
        
        const normalized_label = normalize_uniform_label(label).replace("[]", "");
        
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

        // if (uniform.texture_unit !== undefined)
        //     console.log("UNIFORM ", normalized_label, " ", uniform.texture_unit! + label_index, "SHADER : ", this.shader_program.name);
        var is_sending_array = false;
        if (value instanceof Array) {
            if (uniform.is_array) {
                is_sending_array = true
            } else {
                throw Error(`Uniform "${label}" in shader program "${this.shader_program.name}" does not accept array values even though one was supplied.`)
            }
        }

        // console.log(label);
        

        if (is_sending_array) {
            value = GraphicsManager.flatten_uniform_array_value(value);
        }

        switch (uniform.type) {
            case WebGLUniformType.TEXTURE_2D:
            case WebGLUniformType.SHADOW_2D:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit! + label_index);
                this.gl.bindTexture(this.gl.TEXTURE_2D, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit! + label_index);
                break;
            case WebGLUniformType.TEXTURE_2D_ARRAY:
            case WebGLUniformType.SHADOW_2D_ARRAY:                
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit! + label_index);
                this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, (value as Texture).webgl_texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit! + label_index);
                break;

            case WebGLUniformType.SHADOW_CUBE_MAP:
            case WebGLUniformType.TEXTURE_CUBE_MAP:
                this.gl.activeTexture(this.gl.TEXTURE0 + uniform.texture_unit! + label_index);
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, (value as CubeMapTexture).webgl_texture);
                this.gl.uniform1i(this.shader_program.uniform_locs[label], uniform.texture_unit! + label_index);
                break;

            case WebGLUniformType.F:
                if (is_sending_array)
                    this.gl.uniform1fv(this.shader_program.uniform_locs[label], value);
                else
                    this.gl.uniform1f(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.I:
                if (is_sending_array)
                    this.gl.uniform1iv(this.shader_program.uniform_locs[label], value);
                else
                    this.gl.uniform1i(this.shader_program.uniform_locs[label], value);
                break;

            case WebGLUniformType.B:
                if (is_sending_array)
                    this.gl.uniform1iv(this.shader_program.uniform_locs[label], value);
                else
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

    static flatten_uniform_array_value(array_value:(Vec2|Vec3|Vec4|Mat2|Mat3|Mat4|number)[]):Float32Array {
        var first_value = array_value[0];
        if (typeof first_value === "number")
            return new Float32Array(array_value as number[]);

        const type_size = first_value.toArray().length;
        let data = new Float32Array(array_value.length * type_size);
        let offset = 0;

        for (const v of array_value) {
            if (typeof v !== "number") {
                const v_array = v.toArray();
                data.set(v_array, offset);
                offset += v_array.length;
            } else {
                data[offset] = v;
                offset += 1;
            }
        }
        

        return data;
    }

    resize_directional_shadow_map() {
        this.directional_light_shadow_map_texture.resize_texture_array(this.directional_lights.length);

        for (var i = 0; i < this.directional_lights.length; ++i) {
            const directional_light = this.directional_lights[i];
            directional_light.shadow_index = i;
        }

    }

    resize_point_shadow_map() {
        this.point_light_shadow_map_texture.resize_texture_array(this.point_lights.length * 6);

        for (var i = 0; i < this.point_lights.length; ++i) {
            const point_light = this.point_lights[i];
            point_light.shadow_index_offset = i * 6;
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

    private render_frame(update_callback:(gm:GraphicsManager, time:number, delta_time:number)=>void, current_time: number = 0):number {        
        
        // first frame, initialize and skip large delta
        if (this.last_frame_time === null) {
            this.last_frame_time = current_time;
            update_callback(this, current_time, 0);
            return requestAnimationFrame((newTime) => this.render_frame(update_callback, newTime));
        }

        // calculate delta in seconds
        let delta_time = (current_time - this.last_frame_time) / 1000;  // already ms → seconds

        delta_time = delta_time;

        this.last_frame_time = current_time;

        update_callback(this, current_time, delta_time);
        
        this.resize_canvas();
        
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Render node heirarchy.
        const ortho_projection = new Mat4().orthoZO(0, this.canvas.width, 0, this.canvas.height, -1, 1);

        this.engine.main_scene.update(current_time, delta_time);

        if (this.engine.main_scene.main_camera_3d) {

            const view_matrix = this.engine.main_scene.main_camera_3d.get_view_matrix();
            const projection_matrix = this.engine.main_scene.main_camera_3d.get_projection_matrix(this.canvas);

            // RENDER SHADOWS
            for (const light of this.point_lights) {
                light.draw_shadow_map(
                    view_matrix,
                    projection_matrix,
                    ortho_projection,
                    current_time, delta_time
                );
            }

            for (const light of this.directional_lights) {                
                light.draw_shadow_map(
                    view_matrix,
                    projection_matrix,
                    ortho_projection,
                    current_time, delta_time
                );
            }

            this.engine.main_scene.render(
                view_matrix,
                projection_matrix,
                ortho_projection,
                current_time, delta_time
            );

        } else {
            console.warn(`The main scene "${this.engine.main_scene.name}" does not have a main camera 3D`);
        }
        
        return requestAnimationFrame((new_time) => this.render_frame(update_callback, new_time));
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
        shader_prog_3d.add_uniform("u_point_light_space_matrix[]", WebGLUniformType.F4M);
        shader_prog_3d.add_uniform("directional_light_shadow_maps", WebGLUniformType.SHADOW_2D_ARRAY);
        shader_prog_3d.add_uniform("point_light_shadow_maps", WebGLUniformType.SHADOW_2D_ARRAY);
        shader_prog_3d.add_uniform("shadow_map_size", WebGLUniformType.F2V);

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

    create_default_point_shadow_shader_program():ShaderProgram {
        const sp = this.create_shader_program("default_point_shadow_shader_program");

        sp.add_shader(this.gl.VERTEX_SHADER, DEFAULT_POINT_SHADOW_VERTEX_SHADER);
        sp.add_shader(this.gl.FRAGMENT_SHADER, DEFAULT_POINT_SHADOW_FRAGMENT_SHADER);

        sp.add_uniform("u_light_space_matrix", WebGLUniformType.F4M);
        sp.add_uniform("u_model", WebGLUniformType.F4M);
        sp.add_uniform("origin", WebGLUniformType.F3V);
        sp.add_uniform("range", WebGLUniformType.F);

        sp.build()

        return sp;
    }
}
