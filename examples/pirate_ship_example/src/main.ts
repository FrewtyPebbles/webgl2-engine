import { Mat3, Mat4, Quat, Vec2, vec3, Vec3, Vec4 } from "@vicimpa/glm";
import Engine, { load_obj, GraphicsManager, WebGLUniformType, Object3D, Skybox, InputManager, Sprite2D, Node, AttachmentType, PointLight, Texture, CubeMapTexture, TextureType, Camera3D, DirectionalLight } from "webgl2-engine";

async function startup(engine:Engine) {

    const im:InputManager = engine.input_manager;

    const gm:GraphicsManager = engine.graphics_manager;

    if (!engine.main_scene)
        throw Error("Main scene not set.");

    if (!gm.webgl_enabled()) {
        throw new Error("WebGL2 is not enabled!");
    }
    const pirate_ship_model_promise = load_obj(gm, "/assets/models/pirate_ship/source/pirate_ship.obj", [
        "/assets/models/pirate_ship/textures/pirate_ship.png"
    ]);

    const anchor_model_promise = load_obj(gm, "/assets/models/MedievalAnchor/source/MedievalAnchor.obj", [
        "/assets/models/MedievalAnchor/textures/AnchorHook_albedo.png"
    ]);

    const cube_model_promise = load_obj(gm, "/assets/models/cube/source/Cube.obj", [
        "/assets/models/cube/textures/goblin.jpeg"
    ]);

    // 2D SHADER
    const shader_prog_shadow_debug = gm.create_shader_program("2D");

    shader_prog_shadow_debug.add_shader(gm.gl.VERTEX_SHADER, await engine.UTIL.load_text_file("/assets/depthmap.vs"));
    shader_prog_shadow_debug.add_shader(gm.gl.FRAGMENT_SHADER, await engine.UTIL.load_text_file("/assets/depthmap.fs"));

    shader_prog_shadow_debug.add_uniform("u_model", WebGLUniformType.F4M);
    shader_prog_shadow_debug.add_uniform("u_projection", WebGLUniformType.F4M);

    shader_prog_shadow_debug.add_uniform("sprite_texture", WebGLUniformType.TEXTURE_2D_ARRAY);

    shader_prog_shadow_debug.build();

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

    // shadows
    shader_prog_submerged.add_uniform("u_directional_light_space_matrix[]", WebGLUniformType.F4M);
    shader_prog_submerged.add_uniform("directional_light_shadow_map", WebGLUniformType.SHADOW_2D_ARRAY);
    shader_prog_submerged.add_uniform("shadow_map_size", WebGLUniformType.F2V)

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

    engine.main_scene.root_node = new Skybox(engine, "default_skybox", skybox_texture, new Vec3(0.5));

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

    const cube_model = await cube_model_promise;

    if (!cube_model)
        throw new Error("Failed to load cube model.")

    const cube = new Object3D(engine, "cube", cube_model);

    cube.model.material.roughness = 1.0
    cube.model.material.metalic = 0.0
    cube.model.material.blend_function = {sfactor:gm.gl.SRC_ALPHA, dfactor:gm.gl.ONE_MINUS_SRC_ALPHA};
    anchor.model.material.set_shader_program(shader_prog_submerged);

    await anchor.set_lua_file("/assets/src/anchor.lua");

    await pirate_ship.set_lua_file("/assets/src/pirate_ship.lua");

    const point_light = new PointLight(engine, "point_light", new Vec3(1.0,1.0,1.0), 1.0, 1.0, 1.0, 10.0, 1000.0);
    
    const ocean_light = new DirectionalLight(engine, "ocean_light", new Vec3(0.0,0.0,1.0), 1.0, 1.0, 1.0, 7.0)
    const sun_light = new DirectionalLight(engine, "sun_light", new Vec3(1.0,1.0,0.0), 1.0, 1.0, 1.0, 1.0)
    
    const overlay = new Node(engine, "overlay")

    
    engine.main_scene.root_node.push_child(pirate_ship);
    engine.main_scene.root_node.push_child(anchor);
    // engine.main_scene.root_node.push_child(point_light);
    // engine.main_scene.root_node.pushdds_child(cube);
    engine.main_scene.root_node.push_child(sun_light);
    engine.main_scene.root_node.push_child(ocean_light);
    
    // const depth_texture = new Sprite2D(engine, "depth_texture", engine.main_scene.directional_light_shadow_map_texture, shader_prog_shadow_debug);
    engine.main_scene.root_node.push_child(overlay);

    // overlay.push_child(depth_texture);

    cube.position = new Vec3(0,-100,0)
    cube.scale = new Vec3(100, 30.0, 100);
    // depth_texture.position = new Vec2(300, 300)

    ocean_light.rotation.rotateZ(270 * (Math.PI / 180))
    sun_light.rotation.rotateZ(100 * (Math.PI / 180))

    point_light.position = new Vec3(0, 50, 0)
    
    anchor.position = new Vec3(0,130,0);
    anchor.rotation.rotateX(-Math.PI/8);
    anchor.rotation.rotateY(Math.PI/4);
    anchor.rotation.rotateZ(Math.PI/8);
    
    engine.main_scene.main_camera_3d = new Camera3D(engine, "main_camera");

    engine.main_scene.main_camera_3d.position = (new Vec3(0, 2, 5)).mul(70);
}

const canvas: HTMLCanvasElement = document.getElementById("render-canvas") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var engine = new Engine(canvas, null, startup);

engine.start();
