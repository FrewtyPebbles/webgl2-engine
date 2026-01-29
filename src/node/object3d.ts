import { Mat4, Vec4 } from "@vicimpa/glm";
import Engine from "../engine.ts";
import { Node3D } from "../node.ts";
import { Skybox } from "./skybox.ts";
import { Model } from "../graphics/assets/model.ts";
import { CubeMapTexture } from "../graphics/assets/texture.ts";

export class Object3D extends Node3D {
    model:Model;

    constructor(engine:Engine, name:string, model:Model) {
        super(engine, name);
        this.model = model;
    }
    
    render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.model.draw_start();

        this.on_update(this, this.engine, time, delta_time);

        const skybox = this.get_parent_of_type(Skybox);
        if (skybox)
            this.engine.graphics_manager.set_uniform("environment.ambient_light", skybox.ambient_light);

        // CAMERA POS
        if (this.engine.main_scene.main_camera_3d) {
            this.engine.graphics_manager.set_uniform("camera_position", this.engine.main_scene.main_camera_3d.position);
        } else {
            throw Error(`Main scene "${this.engine.main_scene.name}" does not have a main_camera_3d set which is required to render Object3Ds such as the node named "${this.name}".`);
        }

        // PASS IN LIGHTS
        var index = 0;

        var mesh_size = this.model.mesh.dimensions.clone().mul(this.scale).length();

        var local_mesh_center = this.model.mesh.center;
        var mesh_center = new Vec4(local_mesh_center.x, local_mesh_center.y, local_mesh_center.z, 1.0).applyMat4(this.get_world_matrix())
        
        for (const light of this.engine.main_scene.point_lights) {
            if (mesh_center.xyz.distance(light.position) - mesh_size / 2.0 < light.range) {
                light.set_uniforms("point_lights", index);
                index++;
            }
        }
        if (index)
            this.engine.graphics_manager.set_uniform("point_lights_count", index);
        
        index = 0;
        for (const light of this.engine.main_scene.spot_lights) {
            light.set_uniforms("spot_lights", index);
            index++;
        }
        if (index)
            this.engine.graphics_manager.set_uniform("spot_lights_count", index);
        
        index = 0;
        for (const light of this.engine.main_scene.directional_lights) {
            light.set_uniforms("directional_lights", index);
            index++;
        }
        if (index)
            this.engine.graphics_manager.set_uniform("directional_lights_count", index);

        // pass the MVP matrix
        this.engine.graphics_manager.set_uniform("u_model", this.get_world_matrix());

        this.engine.graphics_manager.set_uniform("u_view", view_matrix);

        this.engine.graphics_manager.set_uniform("u_projection", projection_matrix_3d);

        this.model.draw_end();
    }
}