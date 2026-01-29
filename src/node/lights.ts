import { Mat3, Mat4, Quat, Vec3, Vec4 } from "@vicimpa/glm";
import Engine from "../engine.ts";
import { Node, Node3D } from "../node.ts";
import { ShaderProgram } from "../graphics/shader_program.ts";
import { AttachmentType, Framebuffer } from "../graphics/framebuffer.ts";

export class Light extends Node3D {
    color:Vec3;
    ambient:number;
    diffuse:number;
    specular:number;
    energy:number;// radiant flux

    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
    ) {
        super(engine, name);
        this.color = color;
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.energy = energy;
    }



    set_shader_uniforms(shader_program:ShaderProgram, array_name:string, index:number): void {
        shader_program.use();
        this.set_uniforms(array_name, index);
        this.engine.graphics_manager.clear_shader();
    }

    set_uniforms(array_name:string, index:number): void {
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].color`, this.color);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].ambient`, this.ambient);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].diffuse`, this.diffuse);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].specular`, this.specular);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].energy`, this.energy);
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
                    frustum_corners.push(pt.clone().div(pt.w)); // Perspective divide
                }
            }
        }
        return frustum_corners;
    }

    get_light_space_matrix(light_dir: Vec3, corners:Vec4[]):Mat4 {
        console.log("Light dir:", light_dir.toArray());
        // Find the center of the camera frustum to position the light view
        var center = new Vec3(0, 0, 0);
        for (const v of corners) {
            center.add(v.xyz);
        }
        center.div(corners.length);

        // Create light view matrix looking at the frustum center
        const light_view = new Mat4().lookAt(
            center.clone().sub(light_dir.clone().mul(100)),
            center,
            new Vec3(0, 1, 0)
        );

        // Find min and max bounds of corners in light space
        var min_x = Number.MAX_VALUE;
        var max_x = Number.MIN_VALUE;
        var min_y = Number.MAX_VALUE;
        var max_y = Number.MIN_VALUE;
        var min_z = Number.MAX_VALUE;
        var max_z = Number.MIN_VALUE;

        for (const v of corners) {
            const trf = v.applyMat4(light_view);
            min_x = Math.min(min_x, trf.x);
            max_x = Math.max(max_x, trf.x);
            min_y = Math.min(min_y, trf.y);
            max_y = Math.max(max_y, trf.y);
            min_z = Math.min(min_z, trf.z);
            max_z = Math.max(max_z, trf.z);
        }

        const z_mult = 10.0; 
        if (min_z < 0) min_z *= z_mult; else min_z /= z_mult;
        if (max_z < 0) max_z /= z_mult; else max_z *= z_mult;

        const light_projection:Mat4 = new Mat4().orthoZO(min_x, max_x, min_y, max_y, min_z, max_z);
        console.log(`Light-space AABB: x[${min_x.toFixed(1)}, ${max_x.toFixed(1)}]  y[${min_y.toFixed(1)}, ${max_y.toFixed(1)}]  z[${min_z.toFixed(1)}, ${max_z.toFixed(1)}]`);
        return light_projection.mul(light_view);
    }
}

export class PointLight extends Light {
    range:number;
    
    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
        range:number,
    ) {
        super(engine, name, color, ambient, diffuse, specular, energy);
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.range = range;
    }

    set_uniforms(array_name: string, index: number): void {
        const world_matrix = this.get_world_matrix();
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].position`, new Vec3(world_matrix[12], world_matrix[13], world_matrix[14]));
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].range`, this.range);
        super.set_uniforms(array_name, index);
    }

    protected on_parented(): void {
        this.engine.main_scene.point_lights.push(this);
    }

    protected on_removed(node:this, engine:Engine, parent:Node): void {
        super.on_removed(node, engine, parent)
        let light_index = this.engine.main_scene.point_lights.indexOf(this);
        if (light_index > -1) {
            this.engine.main_scene.point_lights.splice(light_index, 1);
        }
    }
}

export class SpotLight extends Light {
    range:number;
    cookie_radius:number;
    
    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
        range:number,
        cookie_radius:number,
    ) {
        super(engine, name, color, ambient, diffuse, specular, energy);
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.range = range;
        this.cookie_radius = cookie_radius;
    }

    set_uniforms(array_name: string, index: number): void {
        const world_matrix = this.get_world_matrix();
        
        const transformed_position = new Vec4(this.position.x, this.position.y, this.position.z, 1.0)
            .applyMat4(world_matrix);

        const world_mat3 = new Mat3().fromMat4(world_matrix); 

        const world_rotation = new Quat().fromMat3(world_mat3).normalize();

        const world_rotation_matrix = new Mat4().fromQuat(world_rotation);
        
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].position`, new Vec3(world_matrix[12], world_matrix[13], world_matrix[14]));
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].rotation`, world_rotation_matrix);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].range`, this.range);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].cookie_radius`, this.cookie_radius);
        super.set_uniforms(array_name, index);
    }

    protected on_parented(): void {
        this.engine.main_scene.spot_lights.push(this);
    }

    protected on_removed(node:this, engine:Engine, parent:Node): void {
        let light_index = this.engine.main_scene.spot_lights.indexOf(this);
        if (light_index > -1) {
            this.engine.main_scene.spot_lights.splice(light_index, 1);
        }
    }
}

export class DirectionalLight extends Light {

    framebuffer:Framebuffer;
    shader_program:ShaderProgram;

    directional_light_space_matrix:Mat4 = new Mat4();

    shadow_resolution:number;

    constructor(
        engine:Engine,
        name:string,
        color:Vec3,
        ambient:number,
        diffuse:number,
        specular:number,
        energy:number,
        shader_program:ShaderProgram|null = null,
        shadow_resolution:number = 1024
    ) {
        super(engine, name, color, ambient, diffuse, specular, energy);
        this.ambient = ambient;
        this.diffuse = diffuse;
        this.specular = specular;
        this.framebuffer = this.engine.graphics_manager.create_framebuffer(
            `directional_shadow_depth_buffer_${this.name}`,
            1024,
            1024,
            [
                {
                    name:"depth",
                    type:AttachmentType.TEXTURE_DEPTH
                }
            ]
        );
        this.shader_program = shader_program ? shader_program : this.engine.graphics_manager.create_default_directional_shadow_shader_program();
        this.shadow_resolution = shadow_resolution;
    }

    protected render_class(view_matrix: Mat4, projection_matrix_3d: Mat4, projection_matrix_2d: Mat4, time: number, delta_time: number): void {
        if (this.engine.main_scene.rendering_depth_map)
            return;
        if (this.engine.main_scene.main_camera_3d) {
            this.engine.main_scene.rendering_depth_map = true
            this.shader_program.use();
            this.on_update(this, this.engine, time, delta_time);
            
            this.framebuffer.use();

            const corners = this.get_frustum_corners_world_space(
                this.engine.main_scene.main_camera_3d.get_projection_matrix(this.engine.canvas),
                this.engine.main_scene.main_camera_3d.get_view_matrix()
            );

            const light_dir = new Vec3(1, 0, 0).applyQuat(this.rotation).normalize();

            this.directional_light_space_matrix = this.get_light_space_matrix(
                light_dir,
                corners
            );

            this.engine.graphics_manager.set_uniform("u_light_space_matrix", this.directional_light_space_matrix);

            const ortho_projection = (new Mat4()).orthoZO(0, this.shadow_resolution, 0, this.shadow_resolution, -1, 1);
            this.engine.main_scene.render(
                this.engine.main_scene.main_camera_3d.get_view_matrix(),
                this.engine.main_scene.main_camera_3d.get_projection_matrix(this.engine.canvas),
                ortho_projection,
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
        const world_matrix = this.get_world_matrix();
        const world_mat3 = new Mat3().fromMat4(world_matrix); 
        const world_rotation = new Quat().fromMat3(world_mat3).normalize();
        const world_rotation_matrix = new Mat4().fromQuat(world_rotation);
        this.engine.graphics_manager.set_uniform(`${array_name}[${index}].rotation`, world_rotation_matrix);
        this.engine.graphics_manager.set_uniform(`u_directional_light_space_matrix[${index}]`, world_rotation_matrix);
        this.engine.graphics_manager.set_uniform(`directional_light_shadow_map[${index}]`, this.framebuffer.textures["depth"]);
        super.set_uniforms(array_name, index);
    }

    protected on_parented(): void {
        this.engine.main_scene.directional_lights.push(this);
    }

    protected on_removed(node:this, engine:Engine, parent:Node): void {
        let light_index = this.engine.main_scene.directional_lights.indexOf(this);
        if (light_index > -1) {
            this.engine.main_scene.directional_lights.splice(light_index, 1);
        }
    }
}