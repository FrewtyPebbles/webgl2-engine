import { Mat4 } from "@vicimpa/glm";
import Engine from "../engine.ts";
import { Model } from "../graphics/assets.ts";
import { Node3D } from "../node.ts";

export class Object3D extends Node3D {
    model:Model;

    constructor(engine:Engine, name:string, model:Model) {
        super(engine, name);
        this.model = model;
    }
    render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4): void {
        this.model.draw_start();

        // CAMERA POS
        this.engine.graphics_manager.set_uniform("camera_position", this.engine.main_camera.position);

        // PASS IN LIGHTS
        var index = 0;
        for (const light of this.engine.point_lights) {
            light.set_uniforms("point_lights", index);
            index++;
        }
        if (index)
            this.engine.graphics_manager.set_uniform("point_lights_count", index);
        
        index = 0;
        for (const light of this.engine.spot_lights) {
            light.set_uniforms("spot_lights", index);
            index++;
        }
        if (index)
            this.engine.graphics_manager.set_uniform("spot_lights_count", index);
        
        index = 0;
        for (const light of this.engine.directional_lights) {
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