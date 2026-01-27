import { Mat3, Mat4, Quat, Vec2, vec3, Vec3 } from "@vicimpa/glm";
import Engine, { load_obj, GraphicsManager, WebGLUniformType, Object3D, Skybox, InputManager, CubeMapTexture, Sprite2D, Texture, Node, TextureType, AttachmentType, PointLight } from "webgl2-engine";


var wobble_quat = new Quat();

var rotation_quat = new Quat();



function update(engine:Engine, time:number, delta_time:number) {

    const im:InputManager = engine.input_manager;
    const gm:GraphicsManager = engine.graphics_manager;

    const pirate_ship:Object3D|null = engine.get_node("pirate_ship") as Object3D|null;
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
        pirate_ship.position.add(forward.mul(100 * delta_time));
    }

    if (im.is_key_down("KeyS")) {
        pirate_ship.position.add(forward.mul(-100 * delta_time));
    }
    
    pirate_ship.rotation = new Quat().mul(wobble_quat).mul(rotation_quat);
    
    engine.main_camera.rotation.fromMat3(new Mat3().fromMat4(new Mat4().lookAt(engine.main_camera.position, pirate_ship.position.clone().sub(new Vec3(0, -100, 0)), new Vec3(0,1,0)).invert()));

    // if (!planet_sprite)
    //     return;

    // gm.use_framebuffer("test");

    // gm.gl.enable(gm.gl.DEPTH_TEST)

    // pirate_ship.render(
    //     engine.main_camera.get_view_matrix(),
    //     engine.main_camera.get_projection_matrix(engine.canvas),
    //     new Mat4(),
    //     time,
    //     delta_time
    // );

    // gm.gl.disable(gm.gl.DEPTH_TEST)

    // gm.unuse_framebuffer();

    // const test_framebuffer = gm.framebuffers["test"];
    // planet_sprite.sprite_texture = test_framebuffer.textures["default"];
}

async function startup(engine:Engine) {

    const im:InputManager = engine.input_manager;

    const gm:GraphicsManager = engine.graphics_manager;

    if (!gm.webgl_enabled()) {
        throw new Error("WebGL2 is not enabled!");
    }

    // 3D SHADER
    const shader_prog_3d = gm.create_shader_program("3D");

    const pirate_ship_model_promise = load_obj(gm, "/assets/models/pirate_ship/source/pirate_ship.obj", [
        "/assets/models/pirate_ship/textures/pirate_ship.png"
    ]);

    shader_prog_3d.add_shader(gm.gl.VERTEX_SHADER, await engine.UTIL.load_text_file("/assets/default_3d.vs"));
    shader_prog_3d.add_shader(gm.gl.FRAGMENT_SHADER, await engine.UTIL.load_text_file("/assets/default_3d.fs"));

    shader_prog_3d.add_uniform("u_model", WebGLUniformType.F4M);
    shader_prog_3d.add_uniform("u_view", WebGLUniformType.F4M);
    shader_prog_3d.add_uniform("u_projection", WebGLUniformType.F4M);

    // camera
    shader_prog_3d.add_uniform("camera_position", WebGLUniformType.F3V);

    // lights
    shader_prog_3d.add_uniform("point_lights_count", WebGLUniformType.I);
    shader_prog_3d.add_uniform("spot_lights_count", WebGLUniformType.I);
    shader_prog_3d.add_uniform("directional_lights_count", WebGLUniformType.I);

    /// point lights
    shader_prog_3d.add_uniform("point_lights[].position", WebGLUniformType.F3V);
    shader_prog_3d.add_uniform("point_lights[].color", WebGLUniformType.F3V);
    shader_prog_3d.add_uniform("point_lights[].range", WebGLUniformType.F);
    shader_prog_3d.add_uniform("point_lights[].energy", WebGLUniformType.F);
    shader_prog_3d.add_uniform("point_lights[].ambient", WebGLUniformType.F);
    shader_prog_3d.add_uniform("point_lights[].diffuse", WebGLUniformType.F);
    shader_prog_3d.add_uniform("point_lights[].specular", WebGLUniformType.F);

    /// spot lights
    shader_prog_3d.add_uniform("spot_lights[].position", WebGLUniformType.F3V);
    shader_prog_3d.add_uniform("spot_lights[].color", WebGLUniformType.F3V);
    shader_prog_3d.add_uniform("spot_lights[].rotation", WebGLUniformType.F4M);
    shader_prog_3d.add_uniform("spot_lights[].range", WebGLUniformType.F);
    shader_prog_3d.add_uniform("spot_lights[].energy", WebGLUniformType.F);
    shader_prog_3d.add_uniform("spot_lights[].cookie_radius", WebGLUniformType.F);
    shader_prog_3d.add_uniform("spot_lights[].ambient", WebGLUniformType.F);
    shader_prog_3d.add_uniform("spot_lights[].diffuse", WebGLUniformType.F);
    shader_prog_3d.add_uniform("spot_lights[].specular", WebGLUniformType.F);

    /// directional lights
    shader_prog_3d.add_uniform("directional_lights[].rotation", WebGLUniformType.F4M);
    shader_prog_3d.add_uniform("directional_lights[].color", WebGLUniformType.F3V);
    shader_prog_3d.add_uniform("directional_lights[].energy", WebGLUniformType.F);
    shader_prog_3d.add_uniform("directional_lights[].ambient", WebGLUniformType.F);
    shader_prog_3d.add_uniform("directional_lights[].diffuse", WebGLUniformType.F);
    shader_prog_3d.add_uniform("directional_lights[].specular", WebGLUniformType.F);

    // material
    shader_prog_3d.add_uniform("material.has_normal_texture", WebGLUniformType.B);
    shader_prog_3d.add_uniform("material.has_albedo_texture", WebGLUniformType.B);
    shader_prog_3d.add_uniform("material.albedo", WebGLUniformType.F3V);
    shader_prog_3d.add_uniform("material.has_metalic_texture", WebGLUniformType.B);
    shader_prog_3d.add_uniform("material.metalic", WebGLUniformType.F);
    shader_prog_3d.add_uniform("material.has_roughness_texture", WebGLUniformType.B);
    shader_prog_3d.add_uniform("material.roughness", WebGLUniformType.F);
    shader_prog_3d.add_uniform("material.has_ao_texture", WebGLUniformType.B);
    shader_prog_3d.add_uniform("material.ao", WebGLUniformType.F);

    shader_prog_3d.add_uniform("material_texture_albedo", WebGLUniformType.TEXTURE_2D);
    shader_prog_3d.add_uniform("material_texture_normal", WebGLUniformType.TEXTURE_2D);
    shader_prog_3d.add_uniform("material_texture_metalic", WebGLUniformType.TEXTURE_2D);
    shader_prog_3d.add_uniform("material_texture_roughness", WebGLUniformType.TEXTURE_2D);
    shader_prog_3d.add_uniform("material_texture_ao", WebGLUniformType.TEXTURE_2D);

    shader_prog_3d.build()

    // SKYBOX SHADER
    const shader_prog_skybox = gm.create_shader_program("SKYBOX");

    shader_prog_skybox.add_shader(gm.gl.VERTEX_SHADER, await engine.UTIL.load_text_file("/assets/default_skybox.vs"));
    shader_prog_skybox.add_shader(gm.gl.FRAGMENT_SHADER, await engine.UTIL.load_text_file("/assets/default_skybox.fs"));

    shader_prog_skybox.add_uniform("u_view", WebGLUniformType.F4M);
    shader_prog_skybox.add_uniform("u_projection", WebGLUniformType.F4M);

    shader_prog_skybox.add_uniform("skybox_texture", WebGLUniformType.TEXTURE_CUBE_MAP);

    shader_prog_skybox.build();

    // 2D SHADER
    const shader_prog_2d = gm.create_shader_program("2D");

    shader_prog_2d.add_shader(gm.gl.VERTEX_SHADER, await engine.UTIL.load_text_file("/assets/default_2d.vs"));
    shader_prog_2d.add_shader(gm.gl.FRAGMENT_SHADER, await engine.UTIL.load_text_file("/assets/default_2d.fs"));

    shader_prog_2d.add_uniform("u_model", WebGLUniformType.F4M);
    shader_prog_2d.add_uniform("u_projection", WebGLUniformType.F4M);

    shader_prog_2d.add_uniform("sprite_texture", WebGLUniformType.TEXTURE_2D);

    shader_prog_2d.build();

    // Framebuffer
    // const test_framebuffer = gm.create_framebuffer("test", 512, 512, {
    //     default:{
    //         name:"default",
    //         type:AttachmentType.TEXTURE_COLOR
    //     },
    //     depth:{
    //         name:"depth",
    //         type:AttachmentType.TEXTURE_DEPTH
    //     }
    // });

    const skybox_texture = new CubeMapTexture(gm,
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/top.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/bottom.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/front.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/back.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/left.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/right.jpg"),
    {}, 0);

    const planet_texture = new Texture(gm, await engine.UTIL.load_image("/assets/sprites/planet.png"), TextureType.DEFAULT, {})

    engine.root_node = new Skybox(engine, "default_skybox", skybox_texture, shader_prog_skybox);

    const pirate_ship_model = await pirate_ship_model_promise;

    if (!pirate_ship_model)
        throw new Error("Failed to load pirate ship model.")

    pirate_ship_model.set_shader_program(shader_prog_3d);

    const pirate_ship = new Object3D(engine, "pirate_ship", pirate_ship_model);

    pirate_ship.model.material.roughness = 0.001
    pirate_ship.model.material.metalic = 1.0

    const overlay_node = new Node(engine, "overlay")

    const planet_sprite = new Sprite2D(engine, "planet", planet_texture, shader_prog_2d);

    const point_light = new PointLight(engine, "point_light", new Vec3(1.0,0.0,0.0), 1.0, 1.0, 1.0, 100.0, 100.0);

    planet_sprite.scale = new Vec2(100);

    planet_sprite.position = new Vec2(canvas.clientWidth / 2, canvas.clientHeight / 2)

    engine.root_node.push_child(pirate_ship);

    engine.root_node.push_child(point_light);

    engine.root_node.push_child(overlay_node);

    // overlay_node.push_child(planet_sprite);
    

    engine.main_camera.position = (new Vec3(0, 2, 5)).mul(70);
}

const canvas: HTMLCanvasElement = document.getElementById("render-canvas") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var engine = new Engine(canvas, startup, update);

engine.start();
