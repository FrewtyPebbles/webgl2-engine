import { Vec3, Vec2, Mat4, Quat } from '@vicimpa/glm';
import { GraphicsManager, ShaderProgram } from './graphics_manager.ts';
import { Node2D, Node3D, Node } from './node.ts';
import { degrees_to_radians } from './utility.ts';
import { CubeMapTexture, get_skybox_vao, get_sprite_vao, Model, Texture, VAOInfo } from './assets.ts';
import Engine from '../engine.ts';


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

    constructor(engine:Engine, name:string, model:Model) {
        super(engine, name);
        this.model = model;
    }
    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4): void {
        this.model.draw_start();

        // add the MVP matrix
        this.engine.graphics_manager.set_uniform("u_model", this.get_world_matrix());

        this.engine.graphics_manager.set_uniform("u_view", view_matrix);

        this.engine.graphics_manager.set_uniform("u_projection", projection_matrix_3d);

        this.model.draw_end();

        // render children
        super.render(view_matrix, projection_matrix_3d, projection_matrix_2d);
    }
}

export class Skybox extends Node {
    vao:VAOInfo;
    shader_program:ShaderProgram;
    cubemap_texture:CubeMapTexture;

    constructor(engine:Engine, name:string, cubemap_texture:CubeMapTexture, shader_program:ShaderProgram) {
        super(engine, name);
        this.vao = get_skybox_vao(this.engine.graphics_manager);
        this.shader_program = shader_program;
        this.cubemap_texture = cubemap_texture;
    }
    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4): void {
        if (!this.shader_program)
            throw Error(`Shader program not set for skybox.`);

        const gm = this.engine.graphics_manager;

        gm.gl.depthFunc(gm.gl.LEQUAL);

        this.shader_program.use();

        // bind the texture
        gm.set_uniform("skybox_texture", this.cubemap_texture);

        // add the VP matrix
        gm.set_uniform("u_view", view_matrix);

        gm.set_uniform("u_projection", projection_matrix_3d);

        // render vao
        gm.gl.bindVertexArray(this.vao.vao);
        gm.gl.drawElements(gm.gl.TRIANGLES, this.vao.index_count, gm.gl.UNSIGNED_SHORT, 0);
        gm.gl.bindVertexArray(null);

        gm.gl.depthFunc(gm.gl.LESS);

        gm.clear_shader()

        // render children
        super.render(view_matrix, projection_matrix_3d, projection_matrix_2d);

    }
}

export class Sprite2D extends Node2D {
    shader_program:ShaderProgram;
    vao:VAOInfo;
    sprite_texture:Texture;

    constructor(
        engine:Engine,
        name:string,
        shader_program:ShaderProgram,
        sprite_texture:Texture
    ) {
        super(engine, name);
        this.vao = get_sprite_vao(this.engine.graphics_manager);
        this.shader_program = shader_program;
        this.sprite_texture = sprite_texture;
    }

    render(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4): void {
        if (!this.shader_program)
            throw Error(`Shader program not set for skybox.`);

        const gm = this.engine.graphics_manager;

        gm.gl.enable(gm.gl.BLEND);
        gm.gl.blendFunc(gm.gl.SRC_ALPHA, gm.gl.ONE_MINUS_SRC_ALPHA);

        this.shader_program.use();

        // bind the texture
        gm.set_uniform("sprite_texture", this.sprite_texture);

        // add the MVP matrix
        gm.set_uniform("u_model", this.get_world_matrix());


        gm.set_uniform("u_projection", projection_matrix_2d);

        // render vao
        gm.gl.bindVertexArray(this.vao.vao);
        gm.gl.drawElements(gm.gl.TRIANGLES, this.vao.index_count, gm.gl.UNSIGNED_SHORT, 0);
        gm.gl.bindVertexArray(null);

        console.log("TEST");
        

        gm.clear_shader()
        gm.gl.disable(gm.gl.BLEND);

        // render children
        super.render(view_matrix, projection_matrix_3d, projection_matrix_2d);

    }
}