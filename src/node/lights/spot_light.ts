import { Mat3, Mat4, Quat, Vec3, Vec4 } from "@vicimpa/glm";
import Engine from "../../engine";
import { Light } from "./light";
import { Node } from "../../node";

export class SpotLight extends Light {
    range:number;
    cookie_radius:number;
    
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
    ) {
        super(engine, name, color, ambient, diffuse, specular, energy);
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.range = range;
        this.cookie_radius = cookie_radius;
    }

    set_uniforms(array_name: string, index: number): void {
        const world_matrix = this.get_world_matrix();
        
        const transformed_position = new Vec4(this.position.x, this.position.y, this.position.z, 1.0)
            .applyMat4(world_matrix);

        const world_mat3 = new Mat3().fromMat4(world_matrix); 

        const world_rotation = new Quat().fromMat3(world_mat3).normalize();

        const world_rotation_matrix = new Mat4().fromQuat(world_rotation);
        
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].position`, new Vec3(world_matrix[12], world_matrix[13], world_matrix[14]));
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].rotation`, world_rotation_matrix);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].range`, this.range);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].cookie_radius`, this.cookie_radius);
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