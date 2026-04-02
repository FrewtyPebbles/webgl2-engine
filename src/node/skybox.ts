import { Mat4, Vec3 } from "@vicimpa/glm";
import Engine from "../engine";
import { Node } from "../node";
import { ShaderProgram } from "../graphics/shader_program";
import { CubeMapTexture } from "../graphics/assets/texture";
import { get_skybox_vao, VAOInfo } from "../graphics/assets/vaos";

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

    protected before_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.shader_program.use(false);
    }

    protected after_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.engine.graphics_manager.clear_shader();
    }

    set_uniforms(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        const gm = this.engine.graphics_manager;

        // bind the texture
        gm.set_uniform("skybox_texture", this.cubemap_texture);
        
        // add the VP matrix
        gm.set_uniform("u_view", view_matrix);

        gm.set_uniform("u_projection", projection_matrix_3d);
    }

    render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        if (this.engine.main_scene.rendering_depth_map)
            return;
        if (!this.shader_program)
            throw Error(`Shader program not set for skybox.`);

        const gm = this.engine.graphics_manager;

        this.shader_program.use(true);
        
        gm.gl.depthFunc(gm.gl.LEQUAL);
        
        this.on_render(this, this.engine, time, delta_time);

        this.set_uniforms(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);

        this.shader_program.apply_all_uniforms()

        // render vao
        gm.gl.bindVertexArray(this.vao.vao);
        gm.gl.drawElements(gm.gl.TRIANGLES, this.vao.index_count, gm.gl.UNSIGNED_SHORT, 0);
        gm.gl.bindVertexArray(null);

        gm.gl.depthFunc(gm.gl.LESS);

        gm.clear_shader();
    }
    cleanup() {
        this.cubemap_texture.cleanup()
        super.cleanup()
    }
}