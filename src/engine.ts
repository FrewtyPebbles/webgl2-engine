import { GraphicsManager } from "./graphics/graphics_manager.ts";
import { Camera3D } from "./node/camera3d.ts";
import { Node } from "./node.ts";
import { InputManager } from "./input/input_manager.ts";
import Utility from "./utility.ts";
import { DirectionalLight, Light, PointLight, SpotLight } from "./node/lights.ts";


export default class Engine {
    canvas:HTMLCanvasElement;
    graphics_manager:GraphicsManager;
    input_manager:InputManager;

    // This keeps track of all lights in the scene tree,
    // makes it more efficient to render all the lights.
    point_lights:PointLight[] = [];
    directional_lights:DirectionalLight[] = [];
    spot_lights:SpotLight[] = [];
    
    // EVENT CALLBACKS
    on_global_startup_callback:(engine:Engine) => Promise<void>;
    on_global_update_callback:(engine:Engine, time:number, delta_time:number) => void;

    UTIL = Utility;

    // Node Heirarchy
    root_node:Node = new Node(this, "root_node");
    main_camera:Camera3D = new Camera3D(this, "camera0");

    get_node(name:string):Node|null {
        // traverse scene tree until we find the node.
        return this.get_node_search(name, this.root_node)
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



    constructor(
        canvas:HTMLCanvasElement,
        on_global_startup_callback:(engine:Engine) => Promise<void> = async(engine) => {},
        on_global_update_callback:(engine:Engine, time:number, delta_time:number) => void = (engine, time, delta_time) => {},
    ) {
        this.canvas = canvas;
        this.graphics_manager = new GraphicsManager(this, this.canvas);
        this.input_manager = new InputManager(this);
        this.on_global_startup_callback = on_global_startup_callback;
        this.on_global_update_callback = on_global_update_callback;
    }

    async start() {
        await this.on_global_startup_callback(this);
        this.graphics_manager.render((_, time, delta_time) => {
            this.on_global_update_callback(this, time, delta_time);
            this.input_manager.update();
        })
    }
};