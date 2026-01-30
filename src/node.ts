import { Vec3, Vec2, Mat4, Quat } from '@vicimpa/glm';
import { GraphicsManager } from './graphics/graphics_manager.ts';
import Engine from './engine.ts';

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

    protected on_parented() {}

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
    
    push_child(node:Node) {
        if (node.parent) {
            let parent = node.parent;
            node.parent.remove_child(node);
        }

        this.children.push(node);
        node.parent = this;
        node.on_ready(this, this.engine);
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
            index = 0;

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
    
    render(view_matrix:Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        this.render_class(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        this.render_children(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
    }
    
    protected render_children(view_matrix:Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        for (const child of this.children) {
            child.render(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);
        }
    }
    // This is the function where the webgl2 state is set to render.
    protected render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.on_update(this, this.engine, time, delta_time);
    }
}

export class Node2D extends Node {
    rotation:number = 0.0; // radians
    scale:Vec2 = new Vec2(1.0);
    position:Vec2 = new Vec2(0.0);

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
    rotation:Quat = new Quat(); // radians
    scale:Vec3 = new Vec3(1.0);
    position:Vec3 = new Vec3(0.0);

    get_model_matrix():Mat4 {
        const model = new Mat4().identity();

        model.translate(this.position);

        const rotation_mat = new Mat4().fromQuat(this.rotation);
        model.mul(rotation_mat);

        model.scale(this.scale);

        return model;
    }

    get_world_matrix():Mat4 {
        const local = this.get_model_matrix();
        
        if (this.parent instanceof Node3D) {
            return this.parent.get_world_matrix().mul(local)
        } else if (this.parent) {
            let parent = this.parent.parent;
            while (parent) {
                if (parent instanceof Node3D) {
                    return parent.get_world_matrix().mul(local)
                }
                parent = parent.parent;
            }
        }

        return local;
    }
}