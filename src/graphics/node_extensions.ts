import { Vec3, Vec2, Mat4, Quat } from '@vicimpa/glm';
import GraphicsManager, { ShaderProgram } from './graphics_manager';
import { Node2D, Node3D } from './node';
import { degrees_to_radians } from './utility';
import { Model, Texture } from './assets';


export class Camera3D extends Node3D {
    fov:number = degrees_to_radians(60);
    near_plane:number = 0.1;
    far_plane:number = 1000.0;

    get_projection_matrix(canvas:HTMLCanvasElement): Mat4 {
        const aspect = canvas.width / canvas.height;

        return new Mat4().perspectiveNO(
            this.fov,
            aspect,
            this.near_plane,
            this.far_plane
        );
    }

    get_view_matrix(): Mat4 {
        const view = new Mat4().identity();

        // Inverse rotation
        const invRot = this.rotation.clone().invert();
        view.mul(new Mat4().fromQuat(invRot));

        // Inverse translation
        view.translate(this.position.clone().negate());

        return view;
    }
}

export class Object3D extends Node3D {
    model:Model;
    gm:GraphicsManager;

    constructor(gm:GraphicsManager, model:Model) {
        super();
        this.gm = gm;
        this.model = model;
    }
    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4): void {
        this.model.draw_start();

        // add the MVP matrix
        this.gm.set_uniform("u_model", this.get_world_matrix());

        this.gm.set_uniform("u_view", view_matrix);

        this.gm.set_uniform("u_projection", projection_matrix_3d);

        this.model.draw_end();

        // render children
        super.render(view_matrix, projection_matrix_3d, projection_matrix_2d);
    }
}

export class Sprite2D extends Node2D {
    gm:GraphicsManager;
    shader_program:ShaderProgram;

    textures:{[key:string]:Texture} = {};

    constructor(
        gm:GraphicsManager,
        shader_program:ShaderProgram,
        sprite_texture:Texture
    ) {
        super();
        this.gm = gm;
        this.shader_program = shader_program;
        this.textures["sprite_texture"] = sprite_texture;
    }

    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4): void {
        this.shader_program.use();

        for (const [label, texture] of Object.entries(this.textures)) {
            this.gm.set_uniform(label, texture);
        }

        // add the MVP matrix
        this.gm.set_uniform("u_model", this.get_world_matrix());

        this.gm.set_uniform("u_view", view_matrix);

        this.gm.set_uniform("u_projection", projection_matrix_2d);

        this.gm.clear_shader();

        // render children
        super.render(view_matrix, projection_matrix_3d, projection_matrix_2d);
    }
}