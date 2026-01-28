import { Mat3, Mat4, Quat, Vec2, vec3, Vec3, Vec4 } from "@vicimpa/glm";
import Engine, { load_obj, GraphicsManager, WebGLUniformType, Object3D, Skybox, InputManager, Sprite2D, Node, AttachmentType, PointLight, Texture, CubeMapTexture, TextureType } from "webgl2-engine";


var wobble_quat = new Quat();

var rotation_quat = new Quat();



function update(engine:Engine, time:number, delta_time:number) {

    const im:InputManager = engine.input_manager;
    const gm:GraphicsManager = engine.graphics_manager;

    const pirate_ship:Object3D|null = engine.get_node("pirate_ship") as Object3D|null;
    const anchor:Object3D|null = engine.get_node("anchor") as Object3D|null;
    const point_light:PointLight|null = engine.get_node("point_light") as PointLight|null;
    const planet_sprite:Sprite2D|null = engine.get_node("planet") as Sprite2D|null;

    if (!pirate_ship)
        return;

    if (im.is_key_down("KeyA"))
        rotation_quat.mul(new Quat().setAxisAngle(new Vec3(0,1,0), 1 * delta_time));
    if (im.is_key_down("KeyD"))
        rotation_quat.mul(new Quat().setAxisAngle(new Vec3(0,1,0), -1 * delta_time));
    
    const forward = new Vec3(-1, 0, 0).applyQuat(rotation_quat);
    const right = new Vec3(0, 0, -1).applyQuat(rotation_quat);

    const wobble_pitch = Math.sin(time * 0.002) * 0.15;
    const wobble_roll  = Math.cos(time * 0.002) * 0.10;

    // rebuild wobble every frame
    wobble_quat = new Quat()
        .setAxisAngle(forward, wobble_pitch)
        .mul(new Quat().setAxisAngle(right, wobble_roll));

    if (im.is_key_down("KeyW")) {        
        pirate_ship.position.add(forward.clone().mul(100 * delta_time));
    }

    if (im.is_key_down("KeyS")) {
        pirate_ship.position.add(forward.clone().mul(-100 * delta_time));
    }

    var local_mesh_center = pirate_ship.model.mesh.center;
    var mesh_center = new Vec4(local_mesh_center.x, local_mesh_center.y, local_mesh_center.z, 1.0).applyMat4(pirate_ship.get_world_matrix())
    engine.main_camera.rotation.fromMat3(new Mat3().fromMat4(new Mat4().lookAt(engine.main_camera.position, mesh_center, new Vec3(0,1,0)).invert()));
    
    pirate_ship.rotation = new Quat().mul(wobble_quat).mul(rotation_quat);

    if (anchor) {
        anchor.position.y += Math.cos(time * 0.01);
    }
}

async function startup(engine:Engine) {

    const im:InputManager = engine.input_manager;

    const gm:GraphicsManager = engine.graphics_manager;

    if (!gm.webgl_enabled()) {
        throw new Error("WebGL2 is not enabled!");
    }
    const pirate_ship_model_promise = load_obj(gm, "/assets/models/pirate_ship/source/pirate_ship.obj", [
        "/assets/models/pirate_ship/textures/pirate_ship.png"
    ]);

    const anchor_model_promise = load_obj(gm, "/assets/models/MedievalAnchor/source/MedievalAnchor.obj", [
        "/assets/models/MedievalAnchor/textures/AnchorHook_albedo.png"
    ]);

    // 3D SHADER
    const shader_prog_submerged = gm.create_shader_program("submerged");

    shader_prog_submerged.add_shader(gm.gl.VERTEX_SHADER, await engine.UTIL.load_text_file("/assets/submerged.vs"));
    shader_prog_submerged.add_shader(gm.gl.FRAGMENT_SHADER, await engine.UTIL.load_text_file("/assets/submerged.fs"));

    // utility
    shader_prog_submerged.add_uniform("time", WebGLUniformType.F);

    // SHADOWS
    shader_prog_submerged.add_uniform("depth_cubemap", WebGLUniformType.TEXTURE_CUBE_MAP);

    // MVP
    shader_prog_submerged.add_uniform("u_model", WebGLUniformType.F4M);
    shader_prog_submerged.add_uniform("u_view", WebGLUniformType.F4M);
    shader_prog_submerged.add_uniform("u_projection", WebGLUniformType.F4M);

    // environment
    shader_prog_submerged.add_uniform("environment.ambient_light", WebGLUniformType.F3V);

    // camera
    shader_prog_submerged.add_uniform("camera_position", WebGLUniformType.F3V);

    // lights
    shader_prog_submerged.add_uniform("point_lights_count", WebGLUniformType.I);
    shader_prog_submerged.add_uniform("spot_lights_count", WebGLUniformType.I);
    shader_prog_submerged.add_uniform("directional_lights_count", WebGLUniformType.I);

    /// point lights
    shader_prog_submerged.add_uniform("point_lights[].position", WebGLUniformType.F3V);
    shader_prog_submerged.add_uniform("point_lights[].color", WebGLUniformType.F3V);
    shader_prog_submerged.add_uniform("point_lights[].range", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("point_lights[].energy", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("point_lights[].ambient", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("point_lights[].diffuse", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("point_lights[].specular", WebGLUniformType.F);

    /// spot lights
    shader_prog_submerged.add_uniform("spot_lights[].position", WebGLUniformType.F3V);
    shader_prog_submerged.add_uniform("spot_lights[].color", WebGLUniformType.F3V);
    shader_prog_submerged.add_uniform("spot_lights[].rotation", WebGLUniformType.F4M);
    shader_prog_submerged.add_uniform("spot_lights[].range", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("spot_lights[].energy", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("spot_lights[].cookie_radius", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("spot_lights[].ambient", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("spot_lights[].diffuse", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("spot_lights[].specular", WebGLUniformType.F);

    /// directional lights
    shader_prog_submerged.add_uniform("directional_lights[].rotation", WebGLUniformType.F4M);
    shader_prog_submerged.add_uniform("directional_lights[].color", WebGLUniformType.F3V);
    shader_prog_submerged.add_uniform("directional_lights[].energy", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("directional_lights[].ambient", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("directional_lights[].diffuse", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("directional_lights[].specular", WebGLUniformType.F);

    // material
    shader_prog_submerged.add_uniform("material.has_normal_texture", WebGLUniformType.B);
    shader_prog_submerged.add_uniform("material.has_albedo_texture", WebGLUniformType.B);
    shader_prog_submerged.add_uniform("material.albedo", WebGLUniformType.F3V);
    shader_prog_submerged.add_uniform("material.has_metalic_texture", WebGLUniformType.B);
    shader_prog_submerged.add_uniform("material.metalic", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("material.has_roughness_texture", WebGLUniformType.B);
    shader_prog_submerged.add_uniform("material.roughness", WebGLUniformType.F);
    shader_prog_submerged.add_uniform("material.has_ao_texture", WebGLUniformType.B);
    shader_prog_submerged.add_uniform("material.ao", WebGLUniformType.F);

    shader_prog_submerged.add_uniform("material_texture_albedo", WebGLUniformType.TEXTURE_2D);
    shader_prog_submerged.add_uniform("material_texture_normal", WebGLUniformType.TEXTURE_2D);
    shader_prog_submerged.add_uniform("material_texture_metalic", WebGLUniformType.TEXTURE_2D);
    shader_prog_submerged.add_uniform("material_texture_roughness", WebGLUniformType.TEXTURE_2D);
    shader_prog_submerged.add_uniform("material_texture_ao", WebGLUniformType.TEXTURE_2D);

    shader_prog_submerged.build()

    const skybox_texture = new CubeMapTexture(gm,
        TextureType.COLOR,
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/top.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/bottom.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/front.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/back.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/left.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/right.jpg"),
    {}, 0);

    engine.root_node = new Skybox(engine, "default_skybox", skybox_texture, new Vec3(0.5));

    const pirate_ship_model = await pirate_ship_model_promise;

    if (!pirate_ship_model)
        throw new Error("Failed to load pirate ship model.")

    const pirate_ship = new Object3D(engine, "pirate_ship", pirate_ship_model);

    pirate_ship.model.material.roughness = 1.0
    pirate_ship.model.material.metalic = 0.0
    pirate_ship.model.material.blend_function = {sfactor:gm.gl.SRC_ALPHA, dfactor:gm.gl.ONE_MINUS_SRC_ALPHA};
    pirate_ship.model.material.set_shader_program(shader_prog_submerged);

    const anchor_model = await anchor_model_promise;

    if (!anchor_model)
        throw new Error("Failed to load anchor model.")

    const anchor = new Object3D(engine, "anchor", anchor_model);

    anchor.model.material.roughness = 1.0
    anchor.model.material.metalic = 0.0
    anchor.model.material.blend_function = {sfactor:gm.gl.SRC_ALPHA, dfactor:gm.gl.ONE_MINUS_SRC_ALPHA};
    anchor.model.material.set_shader_program(shader_prog_submerged);

    anchor.on_update_callback = (node, engine, time, delta_time) => {
        const gm:GraphicsManager = engine.graphics_manager;
        gm.set_uniform("time", time);
    }

    pirate_ship.on_update_callback = (node, engine, time, delta_time) => {
        const gm:GraphicsManager = engine.graphics_manager;
        gm.set_uniform("time", time);
    }

    const point_light = new PointLight(engine, "point_light", new Vec3(1.0,1.0,1.0), 1.0, 1.0, 1.0, 10.0, 1000.0);
    
    engine.root_node.push_child(pirate_ship);
    engine.root_node.push_child(anchor);
    engine.root_node.push_child(point_light);

    point_light.position = new Vec3(0, 100, 0)
    
    anchor.position = new Vec3(0,130,0);
    anchor.rotation.rotateX(-Math.PI/8);
    anchor.rotation.rotateY(Math.PI/4);
    anchor.rotation.rotateZ(Math.PI/8);

    engine.main_camera.position = (new Vec3(0, 2, 5)).mul(70);
}

const canvas: HTMLCanvasElement = document.getElementById("render-canvas") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var engine = new Engine(canvas, startup, update);

engine.start();
