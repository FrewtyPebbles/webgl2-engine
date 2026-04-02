import { GraphicsManager } from "../graphics_manager";
import { ShaderProgram } from "../shader_program";
import { Material } from "./material";
import { Mesh } from "./mesh";

export class Model {
    gm:GraphicsManager;
    name:string;
    mesh:Mesh;
    material:Material;

    constructor(
        gm:GraphicsManager,
        name:string,
        mesh:Mesh,
        material:Material,
    ) {
        this.gm = gm;
        this.name = name;
        this.mesh = mesh;
        this.material = material;
    }


    draw_start() {
        if (!this.gm.engine.main_scene.rendering_depth_map)
            this.material.draw_start();
    }
    
    draw_end() {
        this.mesh.draw();
        if (!this.gm.engine.main_scene.rendering_depth_map)
            this.material.draw_end();
    }
    cleanup() {
        this.mesh.cleanup()
        this.material.cleanup()
    }
}