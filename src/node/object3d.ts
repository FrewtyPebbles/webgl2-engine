import { Mat4, Vec2, Vec4 } from "@vicimpa/glm";
import Engine from "../engine";
import { Node3D } from "../node";
import { Skybox } from "./skybox";
import { Model } from "../graphics/assets/model";
import { CubeMapTexture } from "../graphics/assets/texture";
import { UBOMemberStruct } from "../graphics/assets/uniform_buffer";

export class Object3D extends Node3D {
    model:Model;

    constructor(engine:Engine, name:string, model:Model) {
        super(engine, name);
        this.model = model;
    }
    
    protected before_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.model.material.shader_program.use(false);
    }

    protected after_update(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {
        this.engine.graphics_manager.clear_shader();
    }

    set_uniforms(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number) {
        const gm = this.engine.graphics_manager;

        var u_global_ubo = gm.shader_program?.ubos["u_global"];
        if (u_global_ubo) {
    
            const skybox = this.get_parent_of_type(Skybox);
            if (skybox)
                (u_global_ubo.members["environment"] as UBOMemberStruct).members["ambient_light"].set_uniform(skybox.ambient_light);
    
            const main_camera_3d = this.engine.main_scene.main_camera_3d
    
            // CAMERA POS
            if (main_camera_3d) {
                u_global_ubo.members["camera_position"].set_uniform(main_camera_3d.position);
            } else {
                throw Error(`Main scene "${this.engine.main_scene.name}" does not have a main_camera_3d set which is required to render Object3Ds such as the node named "${this.name}".`);
            }
        }

        // PASS IN LIGHTS
        const point_lights = gm.point_lights;
        const spot_lights = gm.spot_lights;
        const directional_lights = gm.directional_lights;

        const point_lights_count = point_lights.length;
        const spot_lights_count = spot_lights.length;
        const directional_lights_count = directional_lights.length;

        const n = Math.max(
            point_lights_count,
            spot_lights_count,
            directional_lights_count
        )

        var mesh_size = this.model.mesh.dimensions.clone().mul(this.scale).length();

        var local_mesh_center = this.model.mesh.center;
        var mesh_center = new Vec4(local_mesh_center.x, local_mesh_center.y, local_mesh_center.z, 1.0).applyMat4(this.get_world_matrix())

        if (u_global_ubo) {
            for (var i = 0; i < n; ++i) {
                if (i < point_lights_count) {
                    const light = point_lights[i];
                    if (mesh_center.xyz.distance(light.position) - mesh_size / 2.0 < light.range)
                        light.set_uniforms("point_lights", i);
                }
                if (i < spot_lights_count)
                    spot_lights[i].set_uniforms("spot_lights", i);
                if (i < directional_lights_count)
                    directional_lights[i].set_uniforms("directional_lights", i);
            }

            u_global_ubo.members["directional_lights_count"].set_uniform(directional_lights_count);
            u_global_ubo.members["point_lights_count"].set_uniform(point_lights_count);
            u_global_ubo.members["spot_lights_count"].set_uniform(spot_lights_count);

            //PASS SHADOW MAPS
            u_global_ubo.members["shadow_map_size"].set_uniform(new Vec2(gm.shadow_resolution));
        }
        if (!this.engine.main_scene.rendering_depth_map) {
            gm.set_uniform("directional_light_shadow_maps", gm.directional_light_shadow_map_texture)
            gm.set_uniform("point_light_shadow_maps", gm.point_light_shadow_map_texture)
        }
        
        // pass the MVP matrix
        gm.set_uniform("u_model", this.get_world_matrix());

        if (!this.engine.main_scene.rendering_depth_map) {
            gm.set_uniform("u_view", view_matrix);
            gm.set_uniform("u_projection", projection_matrix_3d);
        }

        gm.shader_program!.apply_all_uniforms();
    }

    render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time:number, delta_time:number): void {        
        this.model.draw_start();
        
        this.on_render(this, this.engine, time, delta_time);

        this.set_uniforms(view_matrix, projection_matrix_3d, projection_matrix_2d, time, delta_time);

        this.model.draw_end();
    }

    cleanup() {
        this.model.cleanup()
        super.cleanup()
    }
}