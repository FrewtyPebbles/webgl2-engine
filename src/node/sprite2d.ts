import { Mat4 } from "@vicimpa/glm";
import Engine from "../engine.ts";
import { Node2D } from "../node.ts";
import { ShaderProgram } from "../graphics/shader_program.ts";
import { get_sprite_vao, VAOInfo } from "../graphics/assets/vaos.ts";
import { Texture } from "../graphics/assets/texture.ts";

export class Sprite2D extends Node2D {
    shader_program:ShaderProgram;
    vao:VAOInfo;
    sprite_texture:Texture;

    constructor(
        engine:Engine,
        name:string,
        sprite_texture:Texture,
        shader_program:ShaderProgram|null = null
    ) {
        super(engine, name);
        this.vao = get_sprite_vao(this.engine.graphics_manager);
        this.shader_program = shader_program ? shader_program : this.engine.graphics_manager.default_2d_shader_program;
        this.sprite_texture = sprite_texture;
    }

    render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        if (this.engine.main_scene.rendering_depth_map)
            return;
        if (!this.shader_program)
            throw Error(`Shader program not set for skybox.`);

        const gm = this.engine.graphics_manager;

        gm.gl.enable(gm.gl.BLEND);
        gm.gl.blendFunc(gm.gl.SRC_ALPHA, gm.gl.ONE_MINUS_SRC_ALPHA);

        this.shader_program.use();

        this.on_update(this, this.engine, time, delta_time);

        // bind the texture
        gm.set_uniform("sprite_texture", this.sprite_texture);

        // add the MVP matrix
        gm.set_uniform("u_model", this.get_world_matrix());


        gm.set_uniform("u_projection", projection_matrix_2d);

        // render vao
        gm.gl.bindVertexArray(this.vao.vao);
        gm.gl.drawElements(gm.gl.TRIANGLES, this.vao.index_count, gm.gl.UNSIGNED_SHORT, 0);
        gm.gl.bindVertexArray(null);        

        gm.clear_shader()
        gm.gl.disable(gm.gl.BLEND);
    }
}