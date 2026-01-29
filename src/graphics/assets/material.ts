import { Vec3 } from "@vicimpa/glm";
import { GraphicsManager } from "../graphics_manager.ts";
import { ShaderProgram } from "../shader_program.ts";
import { Texture } from "./texture.ts";

export interface MaterialOptionsObject {
    enable_depth_test?:boolean;
    blend_function?: {
        sfactor: GLenum, dfactor: GLenum
    }
}

export class Material {
    gm:GraphicsManager;
    name:string;
    shader_program:ShaderProgram|null;
    albedo:Vec3|Texture;
    metalic:number|Texture;
    roughness:number|Texture;
    ao:number|Texture;
    normal:Texture|null = null;

    // OPTIONS
    enable_depth_test?:boolean = true;
    blend_function?:{
        sfactor: GLenum, dfactor: GLenum
    };

    constructor(
        gm:GraphicsManager,
        name:string,
        albedo:Vec3|Texture,
        metalic:number|Texture,
        roughness:number|Texture,
        ao:number|Texture,
        normal:Texture|null = null,
        shader_program:string|ShaderProgram|null = null,
        options:MaterialOptionsObject = {},
    ) {
        this.gm = gm;
        this.name = name;
        this.albedo = albedo;
        this.metalic = metalic;
        this.roughness = roughness;
        this.ao = ao;
        this.normal = normal;

        if(shader_program) {
            if (shader_program instanceof ShaderProgram) {
                this.shader_program = shader_program;
            } else {
                this.shader_program = gm.shader_programs[shader_program];
            }
        } else {
            this.shader_program = null;
        }

        // OPTIONS
        if (options.enable_depth_test !== undefined)
            this.enable_depth_test = options.enable_depth_test;
        this.blend_function = options.blend_function;
    }

    set_shader_program(shader_program:string|ShaderProgram) {
        if (shader_program instanceof ShaderProgram) {
            this.shader_program = shader_program;
        } else {
            this.shader_program = this.gm.shader_programs[shader_program];
        }
    }

    set_shader_uniforms(shader_program:ShaderProgram): void {
        shader_program.use();
        this.set_uniforms();
        this.gm.clear_shader();
    }

    set_uniforms(): void {
        if (this.normal === null) {
            this.gm.set_uniform(`material.has_normal_texture`, false);
        } else {
            this.gm.set_uniform(`material.has_normal_texture`, true);
            this.gm.set_uniform(`material_texture_normal`, this.normal);
        }

        if (this.albedo instanceof Texture) {
            this.gm.set_uniform(`material.has_albedo_texture`, true);
            this.gm.set_uniform(`material_texture_albedo`, this.albedo);
        } else {
            this.gm.set_uniform(`material.has_albedo_texture`, false);
            this.gm.set_uniform(`material.albedo`, this.albedo);
        }

        if (this.metalic instanceof Texture) {
            this.gm.set_uniform(`material.has_metalic_texture`, true);
            this.gm.set_uniform(`material_texture_metalic`, this.metalic);
        } else {
            this.gm.set_uniform(`material.has_metalic_texture`, false);
            this.gm.set_uniform(`material.metalic`, this.metalic);
        }

        if (this.roughness instanceof Texture) {
            this.gm.set_uniform(`material.has_roughness_texture`, true);
            this.gm.set_uniform(`material_texture_roughness`, this.roughness);
        } else {
            this.gm.set_uniform(`material.has_roughness_texture`, false);
            this.gm.set_uniform(`material.roughness`, this.roughness);
        }
    }

    draw_start() {
        if (!this.shader_program)
            throw Error(`Shader program not set for model.`);

        if (this.enable_depth_test)
            this.gm.gl.enable(this.gm.gl.DEPTH_TEST);
        else
            this.gm.gl.disable(this.gm.gl.DEPTH_TEST);

        if (this.blend_function) {
            this.gm.gl.enable(this.gm.gl.BLEND);
            this.gm.gl.blendFunc(this.blend_function.sfactor, this.blend_function.dfactor)
        } else {
            this.gm.gl.disable(this.gm.gl.BLEND);
        }

        this.shader_program.use();

        this.set_uniforms();
    }

    draw_end() {
        if (this.enable_depth_test)
            this.gm.gl.disable(this.gm.gl.DEPTH_TEST);

        if (this.blend_function) {
            this.gm.gl.disable(this.gm.gl.BLEND);
        }

        this.gm.clear_shader();
    }
}