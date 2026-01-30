import { GraphicsManager } from "./graphics/graphics_manager.ts";
import { Camera3D } from "./node/camera3d.ts";
import { Node } from "./node.ts";
import { InputManager } from "./input/input_manager.ts";
import Utility from "./utility.ts";
import { DirectionalLight, Light, PointLight, SpotLight } from "./node/lights.ts";
import { HookManager } from "./hook_manager.ts";
import { Scene } from "./scene.ts";


export default class Engine {
    canvas:HTMLCanvasElement;
    graphics_manager:GraphicsManager;
    input_manager:InputManager;
    hook_manager:HookManager;

    main_scene:Scene;
    
    // EVENT CALLBACKS
    on_global_start_callback:(engine:Engine) => Promise<void>;
    on_global_update_callback:(engine:Engine, time:number, delta_time:number) => void;

    UTIL = Utility;

    constructor(
        canvas:HTMLCanvasElement,
        main_scene:Scene | null = null,
        on_global_start_callback:(engine:Engine) => Promise<void> = async(engine) => {},
        on_global_update_callback:(engine:Engine, time:number, delta_time:number) => void = (engine, time, delta_time) => {},
    ) {
        this.canvas = canvas;
        this.input_manager = new InputManager(this);
        this.hook_manager = new HookManager(this);
        this.on_global_start_callback = on_global_start_callback;
        this.on_global_update_callback = on_global_update_callback;
        this.graphics_manager = new GraphicsManager(this, this.canvas);
        this.main_scene = main_scene ? main_scene : new Scene(this, "main_scene");
    }

    async start() {
        await this.on_global_start_callback(this);
        this.graphics_manager.render((_, time, delta_time) => {
            this.on_global_update_callback(this, time, delta_time);
            this.input_manager.update();
        })
    }
};