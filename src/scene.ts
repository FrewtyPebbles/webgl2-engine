import { Mat4 } from "@vicimpa/glm";
import Engine from "./engine";
import { Node } from "./node";
import { Camera3D } from "./node/camera3d";
import { DirectionalLight, PointLight, SpotLight } from "./node/lights.ts";
import { Texture, TextureType } from "./graphics/assets/texture.ts";


export class Scene {
    name:string;
    engine:Engine;

    
    on_scene_start_callback:(engine:Engine, scene:Scene) => Promise<void> = async(engine, scene) => {};
    on_scene_update_callback:(engine:Engine, scene:Scene, time:number, delta_time:number) => void = (engine, time, delta_time) => {};
    
    root_node:Node|null = null;
    main_camera_3d:Camera3D|null = null;
    
    // LIGHTS
    point_lights:PointLight[] = [];
    directional_lights:DirectionalLight[] = [];
    spot_lights:SpotLight[] = [];

    rendering_depth_map:boolean = false;
    
    directional_light_shadow_map_texture:Texture;

    shadow_resolution:number = 8192;

    constructor(engine:Engine, name:string, root_node:Node|null = null, main_camera:Camera3D|null = null) {
        this.engine = engine;
        this.name = name;
        this.root_node = root_node;
        this.main_camera_3d = main_camera;
        this.directional_light_shadow_map_texture = new Texture(
            this.engine.graphics_manager,
            "directional_light_shadow_map_texture",
            this.directional_lights.length,
            this.shadow_resolution,
            this.shadow_resolution,
            TextureType.DEPTH_ARRAY,
            {
                [this.engine.graphics_manager.gl.TEXTURE_COMPARE_MODE]: this.engine.graphics_manager.gl.COMPARE_REF_TO_TEXTURE,
                [this.engine.graphics_manager.gl.TEXTURE_COMPARE_FUNC]: this.engine.graphics_manager.gl.LEQUAL,
                [this.engine.graphics_manager.gl.TEXTURE_MIN_FILTER]: this.engine.graphics_manager.gl.NEAREST,
                [this.engine.graphics_manager.gl.TEXTURE_MAG_FILTER]: this.engine.graphics_manager.gl.NEAREST,
                [this.engine.graphics_manager.gl.TEXTURE_WRAP_S]: this.engine.graphics_manager.gl.REPEAT,
                [this.engine.graphics_manager.gl.TEXTURE_WRAP_T]: this.engine.graphics_manager.gl.REPEAT,
                [this.engine.graphics_manager.gl.TEXTURE_BASE_LEVEL]: 0,
                [this.engine.graphics_manager.gl.TEXTURE_MAX_LEVEL]: 0,
            }
        );
    }

    resize_directional_shadow_map() {
        this.directional_light_shadow_map_texture = new Texture(
            this.engine.graphics_manager,
            "directional_light_shadow_map_texture",
            this.directional_lights.length,
            this.shadow_resolution,
            this.shadow_resolution,
            TextureType.DEPTH_ARRAY,
            {
                [this.engine.graphics_manager.gl.TEXTURE_COMPARE_MODE]: this.engine.graphics_manager.gl.COMPARE_REF_TO_TEXTURE,
                [this.engine.graphics_manager.gl.TEXTURE_COMPARE_FUNC]: this.engine.graphics_manager.gl.LEQUAL,
                [this.engine.graphics_manager.gl.TEXTURE_MIN_FILTER]: this.engine.graphics_manager.gl.NEAREST,
                [this.engine.graphics_manager.gl.TEXTURE_MAG_FILTER]: this.engine.graphics_manager.gl.NEAREST,
                [this.engine.graphics_manager.gl.TEXTURE_WRAP_S]: this.engine.graphics_manager.gl.REPEAT,
                [this.engine.graphics_manager.gl.TEXTURE_WRAP_T]: this.engine.graphics_manager.gl.REPEAT,
                [this.engine.graphics_manager.gl.TEXTURE_BASE_LEVEL]: 0,
                [this.engine.graphics_manager.gl.TEXTURE_MAX_LEVEL]: 0,
            }
        );

        for (var i = 0; i < this.engine.main_scene.directional_lights.length; ++i) {
            const directional_light = this.engine.main_scene.directional_lights[i];

            directional_light.framebuffer.attachment_info_map["depth"].texture = this.directional_light_shadow_map_texture;
            directional_light.framebuffer.set_attachment_texture_array_index("depth", i, true);
        }

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

    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time: number, delta_time: number) {
        if (this.root_node) {
            this.root_node.render(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        } else {
            console.warn(`A root node was not set for scene "${this.name}".`);
        }
    }
};