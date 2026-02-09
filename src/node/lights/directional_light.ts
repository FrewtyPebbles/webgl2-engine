import { Mat3, Mat4, Quat, Vec3, Vec4 } from "@vicimpa/glm";
import Engine from "../../engine.ts";
import { AttachmentType, Framebuffer } from "../../graphics/framebuffer.ts";
import { ShaderProgram } from "../../graphics/shader_program.ts";
import { Node } from "../../node.ts";
import { Light } from "./light.ts";

export class DirectionalLight extends Light {

    shader_program:ShaderProgram;
    shadow_index:number;
    framebuffer:Framebuffer;

    directional_light_space_matrix:Mat4 = new Mat4();

    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
        shader_program:ShaderProgram|null = null,
    ) {
        super(engine, name, color, ambient, diffuse, specular, energy);
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.shadow_index = this.engine.graphics_manager.directional_lights.length;
        this.framebuffer = this.engine.graphics_manager.directional_shadow_depth_buffer;
        this.shader_program = shader_program ? shader_program : this.engine.graphics_manager.create_default_directional_shadow_shader_program();
    }

    draw_shadow_map(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time: number, delta_time: number): void {
        if (this.engine.main_scene.main_camera_3d) {  
                      
            this.engine.main_scene.rendering_depth_map = true
            
            this.shader_program.use();

            this.framebuffer.use();

            
            this.framebuffer.set_attachment_texture_index("depth", this.shadow_index);
            
            this.framebuffer.clear();

            const corners = this.get_frustum_corners_world_space(
                this.engine.main_scene.main_camera_3d.get_projection_matrix(this.engine.canvas),
                this.engine.main_scene.main_camera_3d.get_view_matrix()
            );

            const light_dir = new Vec4(1, 0, 0, 1).applyQuat(this.rotation).xyz;

            this.directional_light_space_matrix = this.get_light_space_matrix(
                light_dir,
                corners
            );

            this.engine.graphics_manager.set_uniform("u_light_space_matrix", this.directional_light_space_matrix);

            this.engine.main_scene.render(
                view_matrix,
                projection_matrix_3d,
                projection_matrix_2d,
                time, delta_time
            );


            this.engine.graphics_manager.unuse_framebuffer();

            this.engine.graphics_manager.clear_shader();
            this.engine.main_scene.rendering_depth_map = false;
        } else {
            throw Error(`The main scene named "${this.engine.main_scene.name}" does not have a main_camera_3d which is required to render a shadow map.`)
        }
    }

    set_uniforms(array_name: string, index: number): void {
        if (this.engine.main_scene.main_camera_3d) {
            const world_matrix = this.get_world_matrix();
            const world_mat3 = new Mat3().fromMat4(world_matrix); 
            const world_rotation = new Quat().fromMat3(world_mat3).normalize();
            const world_rotation_matrix = new Mat4().fromQuat(world_rotation);

            this.engine.graphics_manager.set_uniform(`${array_name}[${index}].rotation`, world_rotation_matrix);
            this.engine.graphics_manager.set_uniform(`u_directional_light_space_matrix[${index}]`, this.directional_light_space_matrix);
            super.set_uniforms(array_name, index);
        } else {
            throw Error(`The main scene named "${this.engine.main_scene.name}" does not have a main_camera_3d which is required to render a shadow map.`)
        }
    }

    protected on_parented(): void {
        this.engine.graphics_manager.directional_lights.push(this);
        this.engine.graphics_manager.resize_directional_shadow_map();
    }

    protected on_removed(node:this, engine:Engine, parent:Node): void {
        let light_index = this.engine.graphics_manager.directional_lights.indexOf(this);
        if (light_index > -1) {
            this.engine.graphics_manager.directional_lights.splice(light_index, 1);
        }
        this.engine.graphics_manager.resize_directional_shadow_map();
    }

    get_frustum_corners_world_space(projection_matrix:Mat4, view_matrix:Mat4):Vec4[] {
        const inv:Mat4 = projection_matrix.clone().mul(view_matrix).invert();
        var frustum_corners:Vec4[] = [];
        for (var x = 0; x < 2; ++x) {
            for (var y = 0; y < 2; ++y) {
                for (var z = 0; z < 2; ++z) {
                    const pt = new Vec4(
                        2.0 * x - 1.0, 
                        2.0 * y - 1.0, 
                        2.0 * z - 1.0, 
                        1.0
                    ).applyMat4(inv);
                    frustum_corners.push(pt.div(pt.w)); // Perspective divide
                }
            }
        }
        return frustum_corners;
    }

    get_light_space_matrix(light_dir: Vec3, corners:Vec4[]):Mat4 {
        const center = new Vec3(0, 0, 0);
        for (const v of corners) center.add(v.xyz);
        center.div(corners.length);

        let radius = 0;
        for (const v of corners) {
            radius = Math.max(radius, v.xyz.clone().sub(center).length());
        }

        if (this.engine.main_scene.main_camera_3d)
            radius /= this.engine.main_scene.main_camera_3d.far_plane        

        const world_up = new Vec3(0, 1, 0);
        const normalized_dir = light_dir.clone().normalize();
        
        let up = world_up;
        if (Math.abs(normalized_dir.dot(world_up)) > 0.99) {
            up = new Vec3(0, 0, 1);
        }

        const light_view = new Mat4().lookAt(
            center.clone().sub(normalized_dir.clone().mul(radius)),
            center,
            up
        );

        var min_x = Number.MAX_VALUE;
        var max_x = Number.MIN_VALUE;
        var min_y = Number.MAX_VALUE;
        var max_y = Number.MIN_VALUE;
        var min_z = Number.MAX_VALUE;
        var max_z = Number.MIN_VALUE;

        for (const v of corners) {
            const trf = v.clone().applyMat4(light_view);
            min_x = Math.min(min_x, trf.x);
            max_x = Math.max(max_x, trf.x);
            min_y = Math.min(min_y, trf.y);
            max_y = Math.max(max_y, trf.y);
            min_z = Math.min(min_z, trf.z);
            max_z = Math.max(max_z, trf.z);
        }

        const z_margin = 10.0; 
        min_z -= z_margin;
        max_z += z_margin;

        return new Mat4().orthoZO(min_x, max_x, min_y, max_y, max_z, min_z).mul(light_view);
    }
}