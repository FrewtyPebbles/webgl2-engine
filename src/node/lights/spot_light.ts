import { Mat3, Mat4, Quat, Vec3, Vec4 } from "@vicimpa/glm";
import Engine from "../../engine";
import { Light } from "./light";
import { Node } from "../../node";
import { UBOMemberArray, UBOMemberStruct } from "../../graphics/assets/uniform_buffer";
import { ShaderProgram } from "../../graphics/shader_program";

export class SpotLight extends Light {
    range:number;
    cookie_radius:number;
    shader_program:ShaderProgram;

    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
        range:number,
        cookie_radius:number,
        shader_program:ShaderProgram|null = null,
    ) {
        super(engine, name, color, ambient, diffuse, specular, energy);
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.range = range;
        this.cookie_radius = cookie_radius;
        this.shader_program = shader_program ? shader_program : this.engine.graphics_manager.create_default_point_shadow_shader_program();
        throw Error("SPOT LIGHTS NOT IMPLEMENTED YET, make sure to replace the function call in this line: this.shader_program = shader_program ? shader_program : this.engine.graphics_manager.create_default_point_shadow_shader_program();");
    }

    protected before_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.shader_program.use(false);
    }

    protected after_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.engine.graphics_manager.clear_shader();
    }

    set_uniforms(array_name: string, index: number): void {
        const world_matrix = this.get_world_matrix();
        
        const transformed_position = new Vec4(this.position.x, this.position.y, this.position.z, 1.0)
            .applyMat4(world_matrix);

        const world_mat3 = new Mat3().fromMat4(world_matrix); 

        const world_rotation = new Quat().fromMat3(world_mat3).normalize();

        const world_rotation_matrix = new Mat4().fromQuat(world_rotation);
        
        var u_global_ubo = this.engine.graphics_manager.shader_program?.ubos["u_global"];
        
        if (u_global_ubo === undefined)
            throw Error(`u_global ubo is undefined for ${this.engine.graphics_manager.shader_program!.name}`);

        var light_struct = (u_global_ubo.members[array_name] as UBOMemberArray).elements[index] as UBOMemberStruct;
        light_struct.members["position"].set_uniform(new Vec3(world_matrix[12], world_matrix[13], world_matrix[14]));
        light_struct.members["rotation"].set_uniform(world_rotation_matrix);
        light_struct.members["range"].set_uniform(this.range);
        light_struct.members["cookie_radius"].set_uniform(this.cookie_radius);
        super.set_uniforms(array_name, index);
    }

    protected on_parented(): void {
        this.engine.graphics_manager.spot_lights.push(this);
    }

    protected on_removed(node:this, engine:Engine, parent:Node): void {
        let light_index = this.engine.graphics_manager.spot_lights.indexOf(this);
        if (light_index > -1) {
            this.engine.graphics_manager.spot_lights.splice(light_index, 1);
        }
    }
}