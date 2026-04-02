import { Vec3, Vec2, Mat4, Quat, Vec4 } from '@vicimpa/glm';
import { GraphicsManager } from './graphics/graphics_manager';
import Engine from './engine';

type Constructor<T> = new (...args: any[]) => T;

export class Node {
    engine:Engine;
    name:string;
    parent:Node|null = null;
    children:Array<Node> = [];
    
    // CALLBACKS
    on_ready_callback:(node:Node, engine:Engine) => void = (node, engine) =>{};
    on_removed_callback:(node:Node, engine:Engine, parent:Node) => void = (node, engine, parent) =>{};
    on_update_callback:(node:Node, engine:Engine, time:number, delta_time:number) => void = (node, engine:Engine, time:number, delta_time:number) =>{};
    on_render_callback:(node:Node, engine:Engine, time:number, delta_time:number) => void = (node, engine:Engine, time:number, delta_time:number) =>{};
    private lua_url:string|null = null;
    
    constructor(engine:Engine, name:string) {
        this.engine = engine
        this.name = name;
    }

    async set_lua_file(url:string) {
        this.lua_url = url;
        await this.engine.hook_manager.add_on_ready_callback(url);
        await this.engine.hook_manager.add_on_removed_callback(url);
        await this.engine.hook_manager.add_on_update_callback(url);
        await this.engine.hook_manager.add_on_render_callback(url);
    }

    protected on_ready(node:this, engine:Engine) {
        this.on_ready_callback(node, engine);
        if (this.lua_url !== null)
            this.engine.hook_manager.call_on_ready_callback(this.lua_url, node, engine);
    }

    protected on_removed(node:this, engine:Engine, parent:Node) {
        this.on_removed_callback(node, engine, parent);
        if (this.lua_url !== null)
            this.engine.hook_manager.call_on_removed_callback(this.lua_url, node, engine, parent);
    }

    protected on_update(node:this, engine:Engine, time:number, delta_time:number) {
        if (this.engine.main_scene.rendering_depth_map)
            return;
        this.on_update_callback(node, engine, time, delta_time);
        if (this.lua_url !== null)
            this.engine.hook_manager.call_on_update_callback(this.lua_url, node, engine, time, delta_time);
    }

    

    protected on_render(node:this, engine:Engine, time:number, delta_time:number) {
        if (this.engine.main_scene.rendering_depth_map)
            return;
        this.on_render_callback(node, engine, time, delta_time);
        if (this.lua_url !== null)
            this.engine.hook_manager.call_on_render_callback(this.lua_url, node, engine, time, delta_time);
    }

    protected on_parented() {
    }

    has_child(node:Node|string):boolean {
        if (node instanceof Node)
            return this.children.includes(node);
        
        // node is string
        for (const child of this.children) {
            if (child.name === node)
                return true;
        }
        return false;
    }

    has_parent(node:Node|string):boolean {
        if (this.parent && (this.parent === node || this.parent.name === node))
            return true;
        if (this.parent)
            return this.parent.has_parent(node);
        return false;
    }

    get_parent(node_name:string):Node|null {
        if (this.parent && this.parent.name === node_name)
            return this.parent;
        if (this.parent)
            return this.parent.get_parent(node_name);
        return null;
    }

    get_parent_of_type<T>(node_type:Constructor<T>):T|null {
        if (this.parent instanceof node_type)
            return this.parent;
        if (this.parent)
            return this.parent.get_parent_of_type<T>(node_type);
        return null;
    }

    get_child(name:string):Node|null {
        
        // node is string
        for (const child of this.children) {
            if (child.name === name)
                return child;
            else {
                const result = child.get_child(name);
                if (result)
                    return result;
            }
        }
        return null;
    }

    get_children_of_type<T>(node_type:Constructor<T>):T[] {
        var target_list:T[] = [];
        var parents:Node[] = [this];
        for (const child of parents[parents.length-1].children) {
            const child_target_list = child.get_children_of_type(node_type);
            target_list.concat(child_target_list);
            if (child instanceof node_type) {
                target_list.push(child);
            }
        }
        return target_list;
    }
    
    push_child(node:Node) {
        if (node.parent) {
            let parent = node.parent;
            node.parent.remove_child(node);
        }

        this.children.push(node);
        node.parent = this;
        node.on_ready(node, this.engine);
        node.on_parented();
    }

    remove_child(node:Node|string) {
        var index;
        if (node instanceof Node) {

            index = this.children.indexOf(node as Node);
            if (index > -1) {
                this.children.splice(index, 1);
            }
            node.parent = null;
        } else {
            // node is string

            // remove parent
            const node_instance = this.engine.main_scene.get_node(node);

            if (node_instance)
                node_instance.parent = null;

            // remove from children of parent.
            index = -1;

            for (const child of this.children) {
                if (child.name === node) {
                    node = child;
                    break;
                }
                    
                index++;
            }

            if (index > -1) {
                this.children.splice(index, 1);
            }
        }
        if (node instanceof Node) {
            node.on_removed(node, this.engine, this);
        }
    }


    protected before_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {}
    protected after_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {}

    update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        this.before_update(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        this.on_update(this, this.engine, time, delta_time);
        this.after_update(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        for (const child of this.children) {
            child.update(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        }
    }

    protected before_render() {}
    protected after_render() {}
    
    render(view_matrix:Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        this.before_render();
        this.render_class(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        this.after_render();
        this.render_children(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
    }
    
    protected render_children(view_matrix:Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        for (const child of this.children) {
            child.render(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        }
    }
    // This is the function where the webgl2 state is set to render.
    protected render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.on_render(this, this.engine, time, delta_time);
    }

    cleanup() {
        for (const child of this.children) {
            child.cleanup();
        }
    }
}

export class Node2D extends Node {
    private stored_position:Vec2;
    private stored_rotation:number; // radians
    private stored_scale:Vec2;

    constructor(engine: Engine, name: string) {
        super(engine, name);
        // Bind the methods to the current instance
        this.proxy_on_change_position = this.proxy_on_change_position.bind(this);
        this.proxy_on_change_scale = this.proxy_on_change_scale.bind(this);

        // Re-initialize proxies now that methods are bound
        this.stored_position = new Proxy(new Vec2(0.0), {set:this.proxy_on_change_position});
        this.stored_rotation = 0.0;
        this.stored_scale = new Proxy(new Vec2(1.0), {set:this.proxy_on_change_scale});
    }

    get position():Vec2 {
        return this.stored_position;
    }

    set position(value:Vec2) {
        this.stored_position = new Proxy(value, {set:this.proxy_on_change_position});
        this.on_change_position(value);
    }

    get rotation():number {
        return this.stored_rotation;
    }

    set rotation(value:number) {
        this.stored_rotation = value;
        this.on_change_rotation(value);
    }

    get scale():Vec2 {
        return this.stored_scale;
    }

    set scale(value:Vec2) {
        this.stored_scale = new Proxy(value, {set:this.proxy_on_change_scale});
        this.on_change_scale(value);
    }
    

    private proxy_on_change_position(target:any, property:string, value:any):boolean {
        target[property] = value;
        this.on_change_position(target);
        return true;
    }

    private proxy_on_change_scale(target:any, property:string, value:any):boolean {
        target[property] = value;
        this.on_change_scale(target);
        return true;
    }

    protected on_change_position(new_value:Vec2) {}// ABSTRACT METHOD
    protected on_change_rotation(new_value:number) {}// ABSTRACT METHOD
    protected on_change_scale(new_value:Vec2) {}// ABSTRACT METHOD

    get_model_matrix():Mat4 {
        let model = (new Mat4()).identity();

        model.translate(new Vec3(this.position.x, this.position.y, 0.0));

        model.rotate(this.rotation, new Vec3(0.0, 0.0, 1.0));

        model.scale(new Vec3(this.scale.x, this.scale.y, 1.0));

        return model;
    }

    get_world_matrix():Mat4 {
        let model = this.get_model_matrix();
        
        if (this.parent instanceof Node2D) {
            model = this.parent.get_model_matrix().mul(model)
        }

        return model;
    }
}

export class Node3D extends Node {

    private stored_position:Vec3;
    private stored_rotation:Quat; // radians
    private stored_scale:Vec3;

    constructor(engine: Engine, name: string) {
        super(engine, name);
        // Bind the methods to the current instance
        this.proxy_on_change_position = this.proxy_on_change_position.bind(this);
        this.proxy_on_change_rotation = this.proxy_on_change_rotation.bind(this);
        this.proxy_on_change_scale = this.proxy_on_change_scale.bind(this);

        // Re-initialize proxies now that methods are bound
        this.stored_position = new Proxy(new Vec3(0.0), { set: this.proxy_on_change_position });
        this.stored_rotation = new Proxy(new Quat(), { set: this.proxy_on_change_rotation });
        this.stored_scale = new Proxy(new Vec3(1.0), { set: this.proxy_on_change_scale });
    }

    get position():Vec3 {
        return this.stored_position;
    }

    set position(value:Vec3) {
        this.stored_position = new Proxy(value, {set:this.proxy_on_change_position});
        this.on_change_position(value);
    }

    get rotation():Quat {
        return this.stored_rotation;
    }

    set rotation(value:Quat) {
        this.stored_rotation = new Proxy(value, {set:this.proxy_on_change_rotation});
        this.on_change_rotation(value);
    }

    get scale():Vec3 {
        return this.stored_scale;
    }

    set scale(value:Vec3) {
        this.stored_scale = new Proxy(value, {set:this.proxy_on_change_scale});
        this.on_change_scale(value);
    }
    

    private proxy_on_change_position(target:any, property:string, value:any):boolean {
        target[property] = value;
        this.on_change_position(target);
        return true;
    }

    private proxy_on_change_rotation(target:any, property:string, value:any):boolean {
        target[property] = value;
        this.on_change_rotation(target);
        return true;
    }

    private proxy_on_change_scale(target:any, property:string, value:any):boolean {
        target[property] = value;
        this.on_change_scale(target);
        return true;
    }

    protected on_change_position(new_value:Vec3) {}// ABSTRACT METHOD
    protected on_change_rotation(new_value:Quat) {}// ABSTRACT METHOD
    protected on_change_scale(new_value:Vec3) {}// ABSTRACT METHOD

    get_world_position():Vec3 {
        const world_matrix = this.get_world_matrix();
        return new Vec3(world_matrix[12], world_matrix[13], world_matrix[14]);
    }

    get_parent_world_matrix():Mat4 {
        if (this.parent instanceof Node3D) {
            return this.parent.get_world_matrix();
        } else if (this.parent) {
            let parent = this.parent.parent;
            while (parent) {
                if (parent instanceof Node3D) {
                    return parent.get_world_matrix();
                }
                parent = parent.parent;
            }
        }
        return new Mat4().identity();
    }

    get_model_matrix():Mat4 {
        const model = new Mat4().identity();

        model.translate(this.position);

        const rotation_mat = new Mat4().fromQuat(this.rotation);
        model.mul(rotation_mat);

        model.scale(this.scale);

        return model;
    }

    get_world_matrix():Mat4 {
        return this.get_parent_world_matrix().mul(this.get_model_matrix())
    }
}