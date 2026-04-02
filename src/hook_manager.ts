import { LuaEngine, LuaFactory } from "wasmoon";
import Engine from "./engine";
import { Node, Node2D, Node3D } from "./node";

import { Vec2, Vec3, Vec4, Mat2, Mat3, Mat4, Quat } from "@vicimpa/glm"
import { Object3D } from "./node/object3d";
import { Sprite2D } from "./node/sprite2d";

// This class handles all of the lua hooks into different nodes.
// It uses a single lua engine since webgl2 cant be multithreaded.
// maybe in the future we will use webgpu and use multiple engines.
export class HookManager {
    engine:Engine;
    lua_factory:LuaFactory;
    lua_engine_promise:Promise<LuaEngine>;
    lua:LuaEngine|null = null;

    on_ready_callbacks:{[key:string]:(node:Node, engine:Engine) => void} = {};
    on_removed_callbacks:{[key:string]:(node:Node, engine:Engine, parent:Node) => void} = {};
    on_update_callbacks:{[key:string]:(node:Node, engine:Engine, time:number, delta_time:number) => void} = {};
    on_render_callbacks:{[key:string]:(node:Node, engine:Engine, time:number, delta_time:number) => void} = {};
    
    constructor(engine:Engine) {
        this.engine = engine;
        this.lua_factory = new LuaFactory();
        this.lua_engine_promise = this.lua_factory.createEngine();
        this.lua_engine_promise
            .then(async (engine) => {
                this.lua = engine;
                await this.set_globals();
            })
            .catch((reason) => {throw new Error(reason);});
    }
    
    call_on_ready_callback(url:string, node:Node, engine:Engine) {
        try {
            this.on_ready_callbacks[url](node, engine);
        } catch (error) {
            if (error instanceof Error) {
                let modified_error = Error(`Error in "on_ready" in lua file at "${url}" attached to "${node.name}":\n${error.message}`);
                modified_error.stack = error.stack;
                throw modified_error;
            }
        }
    }
    
    call_on_removed_callback(url:string, node:Node, engine:Engine, parent:Node) {
        try {
            this.on_removed_callbacks[url](node, engine, parent);
        } catch (error) {
            if (error instanceof Error) {
                let modified_error = Error(`Error in "on_removed" in lua file at "${url}" attached to "${node.name}":\n${error.message}`);
                modified_error.stack = error.stack;
                throw modified_error;
            }
        }
    }
    
    call_on_update_callback(url:string, node:Node, engine:Engine, time:number, delta_time:number) {
        try {
            this.on_update_callbacks[url](node, engine, time, delta_time);
        } catch (error) {
            if (error instanceof Error) {
                let modified_error = Error(`Error in "on_update" in lua file at "${url}" attached to "${node.name}":\n${error.message}`);
                modified_error.stack = error.stack;
                throw modified_error;
            }
        }
    }

    call_on_render_callback(url:string, node:Node, engine:Engine, time:number, delta_time:number) {
        try {
            this.on_render_callbacks[url](node, engine, time, delta_time);
        } catch (error) {
            if (error instanceof Error) {
                let modified_error = Error(`Error in "on_render" in lua file at "${url}" attached to "${node.name}" of type "${node.constructor.name}":\n${error.message}`);
                modified_error.stack = error.stack;
                throw modified_error;
            }
        }
    }
    
    private async do_lua_file_url(url: string) {
        await this.lua_engine_promise;
        
        if (!this.lua)
            return;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load Lua file");
        const code = await res.text();
        
        return this.lua.doString(code);
    }
    
    async add_on_ready_callback(url:string) {
        await this.lua_engine_promise;
        
        if (!this.lua)
            return;
        
        await this.do_lua_file_url(url);
        
        const callback = this.lua.global.get("on_ready");
        
        this.on_ready_callbacks[url] = callback;
    }
    
    async add_on_removed_callback(url:string) {
        await this.lua_engine_promise;
        
        if (!this.lua)
            return;
        
        await this.do_lua_file_url(url);
        
        const callback = this.lua.global.get("on_removed");
        
        this.on_removed_callbacks[url] = callback;
    }
    
    async add_on_update_callback(url:string) {
        await this.lua_engine_promise;
        
        if (!this.lua)
            return;
        
        await this.do_lua_file_url(url);
        
        const callback = this.lua.global.get("on_update");
        
        this.on_update_callbacks[url] = callback;
    }

    async add_on_render_callback(url:string) {
        await this.lua_engine_promise;
        
        if (!this.lua)
            return;
        
        await this.do_lua_file_url(url);
        
        const callback = this.lua.global.get("on_render");
        
        this.on_render_callbacks[url] = callback;
    }

    async set_globals() {
        await this.lua_engine_promise;
    
        if (!this.lua)
            return;
    
        this.lua.global.set("Vec2", create_lua_constructor(Vec2));
        this.lua.global.set("Vec3", create_lua_constructor(Vec3));
        this.lua.global.set("Vec4", create_lua_constructor(Vec4));
        this.lua.global.set("Mat2", create_lua_constructor(Mat2));
        this.lua.global.set("Mat3", create_lua_constructor(Mat3));
        this.lua.global.set("Mat4", create_lua_constructor(Mat4));
        this.lua.global.set("Quat", create_lua_constructor(Quat));
        this.lua.global.set("Node", create_lua_constructor(Node));
        this.lua.global.set("Node3D", create_lua_constructor(Node3D));
        this.lua.global.set("Node2D", create_lua_constructor(Node2D));
        this.lua.global.set("Object3D", create_lua_constructor(Object3D));
        this.lua.global.set("Sprite2D", create_lua_constructor(Sprite2D));
    }
};

function create_lua_constructor<T extends new (...args: any[]) => any>(cls: T) {
  return (...args: ConstructorParameters<T>) => new cls(...args);
}