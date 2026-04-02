import { Mat4 } from "@vicimpa/glm";
import Engine from "./engine";
import { Node } from "./node";
import { Camera3D } from "./node/camera3d";


export class Scene {
    name:string;
    engine:Engine;

    
    on_scene_start_callback:(engine:Engine, scene:Scene) => Promise<void> = async(engine, scene) => {};
    on_scene_update_callback:(engine:Engine, scene:Scene, time:number, delta_time:number) => void = (engine, time, delta_time) => {};
    
    root_node:Node|null = null;
    main_camera_3d:Camera3D|null = null;

    rendering_depth_map:boolean = false;

    constructor(engine:Engine, name:string, root_node:Node|null = null, main_camera:Camera3D|null = null) {
        this.engine = engine;
        this.name = name;
        this.root_node = root_node;
        this.main_camera_3d = main_camera;
    }
    
    get_node(name:string):Node|null {
        // traverse scene tree until we find the node.
        if (this.root_node)
            return this.get_node_search(name, this.root_node)
        else
            return null;
    }

    private get_node_search(name:string, node:Node):Node|null {
        if (!node)
            return null;
        if (node.name == name)
            return node;

        for (const child_node of node.children) {
            const search_result = this.get_node_search(name, child_node);
            if (search_result)
                return search_result;
        }

        return null;
    }

    update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time: number, delta_time: number) {
        if (this.root_node) {
            this.root_node.update(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        } else {
            console.warn(`A root node was not set for scene "${this.name}".`);
        }
    }

    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time: number, delta_time: number) {
        if (this.root_node) {
            this.root_node.render(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        } else {
            console.warn(`A root node was not set for scene "${this.name}".`);
        }
    }

    cleanup() {
        if (this.root_node) {
            this.root_node.cleanup();
        }
        if (this.main_camera_3d) {
            this.main_camera_3d.cleanup();
        }
    }
};