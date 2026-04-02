import { Mat3, Mat4, Quat, Vec3, Vec4 } from "@vicimpa/glm";
import Engine from "../../engine";
import { Node, Node3D } from "../../node";
import { ShaderProgram } from "../../graphics/shader_program";
import { AttachmentType, Framebuffer } from "../../graphics/framebuffer";
import { Texture, TextureType } from "../../graphics/assets/texture";
import { UBOMemberArray, UBOMemberStruct } from "../../graphics/assets/uniform_buffer";



export class Light extends Node3D {
    color:Vec3;
    ambient:number;
    diffuse:number;
    specular:number;
    energy:number;// radiant flux

    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
    ) {
        super(engine, name);
        this.color = color;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.energy = energy;
    }

    set_shader_uniforms(shader_program:ShaderProgram, array_name:string, index:number): void {
        shader_program.use(false);
        this.set_uniforms(array_name, index);
        this.engine.graphics_manager.clear_shader();
    }

    set_uniforms(array_name:string, index:number): void {
        var u_global_ubo = this.engine.graphics_manager.shader_program?.ubos["u_global"];
        
        if (u_global_ubo === undefined)
            throw Error(`u_global ubo is undefined for ${this.engine.graphics_manager.shader_program!.name}`);

        var light_struct = (u_global_ubo.members[array_name] as UBOMemberArray).elements[index] as UBOMemberStruct;
        
        light_struct.members["color"].set_uniform(this.color);
        light_struct.members["ambient"].set_uniform(this.ambient);
        light_struct.members["diffuse"].set_uniform(this.diffuse);
        light_struct.members["specular"].set_uniform(this.specular);
        light_struct.members["energy"].set_uniform(this.energy);
    }
}
