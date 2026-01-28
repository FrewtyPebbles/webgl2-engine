import { Mat4, Vec3 } from "@vicimpa/glm";
import Engine from "../engine.ts";
import { Node } from "../node.ts";
import { ShaderProgram } from "../graphics/shader_program.ts";
import { CubeMapTexture } from "../graphics/assets/texture.ts";
import { get_skybox_vao, VAOInfo } from "../graphics/assets/vaos.ts";

export class Skybox extends Node {
    vao:VAOInfo;
    shader_program:ShaderProgram;
    cubemap_texture:CubeMapTexture;
    ambient_light:Vec3;

    constructor(engine:Engine,
        name:string,
        cubemap_texture:CubeMapTexture,
        ambient_light:Vec3,
        shader_program:ShaderProgram|null = null,
    ) {
        super(engine, name);
        this.vao = get_skybox_vao(this.engine.graphics_manager);
        this.shader_program = shader_program ? shader_program : this.engine.graphics_manager.default_skybox_shader_program;
        this.cubemap_texture = cubemap_texture;
        this.ambient_light = ambient_light;
    }
    render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        if (!this.shader_program)
            throw Error(`Shader program not set for skybox.`);

        const gm = this.engine.graphics_manager;

        gm.gl.depthFunc(gm.gl.LEQUAL);

        this.shader_program.use();

        this.on_update_callback(this, this.engine, time, delta_time);

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

        gm.clear_shader();
    }
}