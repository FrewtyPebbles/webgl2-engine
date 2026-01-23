import { Vec3, Vec2, Mat4, Quat } from '@vicimpa/glm';


export class Node {
    parent:Node|null = null;
    children:Array<Node> = [];

    push_child(node:Node) {
        if (node.parent) {
            node.parent.remove_child(node);
        }
        this.children.push(node);
        node.parent = this;
    }

    has_child(node:Node):boolean {
        return this.children.includes(node);
    }

    remove_child(node:Node) {
        const index = this.children.indexOf(node);
        if (index > -1) {
            this.children.splice(index, 1);
        }
        node.parent = null;
    }

    render(view_matrix:Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4) {
        // render children
        for (const child of this.children) {
            child.render(view_matrix, projection_matrix_3d, projection_matrix_2d)
        }
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
        let model = this.get_model_matrix();
        
        if (this.parent instanceof Node3D) {
            model = this.parent.get_model_matrix().mul(model)
        }

        return model;
    }
}