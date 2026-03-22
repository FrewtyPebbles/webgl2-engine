import { GraphicsManager } from "./graphics/graphics_manager";
import { Camera3D } from "./node/camera3d";
import { Node } from "./node";
import { InputManager } from "./input/input_manager";
import Utility from "./utility";
import { HookManager } from "./hook_manager";
import { Scene } from "./scene";


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
        this.graphics_manager.render();
    }
};