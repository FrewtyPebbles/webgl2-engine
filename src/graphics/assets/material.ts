import { Vec3 } from "@vicimpa/glm";
import { GraphicsManager } from "../graphics_manager";
import { ShaderProgram } from "../shader_program";
import { Texture } from "./texture";
import { UBOMemberStruct } from "./uniform_buffer";

export interface MaterialOptionsObject {
    enable_depth_test?:boolean;
    blend_function?: {
        sfactor: GLenum, dfactor: GLenum
    }
}

export class Material {
    gm:GraphicsManager;
    name:string;
    shader_program:ShaderProgram;
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
            this.shader_program = this.gm.create_default_3d_shader_program();
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
        shader_program.use(false);
        this.set_uniforms();
        this.gm.clear_shader();
    }

    set_uniforms(): void {
        var u_object_ubo = this.shader_program?.ubos["u_object"];
        
        if (u_object_ubo === undefined)
            throw Error("u_object ubo undefined");

        var material_struct:UBOMemberStruct = u_object_ubo.members["material"] as UBOMemberStruct;
        if (this.normal === null) {
            material_struct.members["has_normal_texture"].set_uniform(false);
        } else {
            material_struct.members["has_normal_texture"].set_uniform(true);
            this.gm.set_uniform(`material_texture_normal`, this.normal);
        }

        if (this.albedo instanceof Texture) {
            material_struct.members["has_albedo_texture"].set_uniform(true);
            this.gm.set_uniform(`material_texture_albedo`, this.albedo);
        } else {
            material_struct.members["has_albedo_texture"].set_uniform(false);
            material_struct.members["albedo"].set_uniform(this.albedo);
        }

        if (this.metalic instanceof Texture) {
            material_struct.members["has_metalic_texture"].set_uniform(true);
            this.gm.set_uniform(`material_texture_metalic`, this.metalic);
        } else {
            material_struct.members["has_metalic_texture"].set_uniform(false);
            material_struct.members["metalic"].set_uniform(this.metalic);
        }

        if (this.roughness instanceof Texture) {
            material_struct.members["has_roughness_texture"].set_uniform(true);
            this.gm.set_uniform(`material_texture_roughness`, this.roughness);
        } else {
            material_struct.members["has_roughness_texture"].set_uniform(false);
            material_struct.members["roughness"].set_uniform(this.roughness);
        }
    }

    draw_start(set_uniforms:boolean = true) {
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

        this.shader_program.use(true);

        if (set_uniforms)
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

    cleanup() {
        if (this.albedo instanceof Texture) {
            this.albedo.cleanup();
        }
        if (this.metalic instanceof Texture) {
            this.metalic.cleanup();
        }
        if (this.roughness instanceof Texture) {
            this.roughness.cleanup();
        }
        if (this.ao instanceof Texture) {
            this.ao.cleanup();
        }
        if (this.normal instanceof Texture) {
            this.normal.cleanup();
        }
    }
}