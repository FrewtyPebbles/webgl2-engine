import { Mat3, Mat4, Quat, Vec3, Vec4 } from "@vicimpa/glm";
import Engine from "../../engine";
import { Node, Node3D } from "../../node";
import { ShaderProgram } from "../../graphics/shader_program";
import { AttachmentType, Framebuffer } from "../../graphics/framebuffer";
import { Texture, TextureType } from "../../graphics/assets/texture";



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
        shader_program.use();
        this.set_uniforms(array_name, index);
        this.engine.graphics_manager.clear_shader();
    }

    set_uniforms(array_name:string, index:number): void {
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].color`, this.color);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].ambient`, this.ambient);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].diffuse`, this.diffuse);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].specular`, this.specular);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].energy`, this.energy);
    }
}
