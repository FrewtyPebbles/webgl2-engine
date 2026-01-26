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

        // add the MVP matrix
        this.engine.graphics_manager.set_uniform("u_model", this.get_world_matrix());

        this.engine.graphics_manager.set_uniform("u_view", view_matrix);

        this.engine.graphics_manager.set_uniform("u_projection", projection_matrix_3d);

        this.model.draw_end();
    }
}