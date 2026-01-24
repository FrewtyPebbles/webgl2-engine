import { Mat3, Mat4, Quat, Vec2, Vec3 } from "@vicimpa/glm";
import Engine, { load_obj, GraphicsManager, WebGLUniformType, Object3D, Skybox, InputManager, CubeMapTexture, Sprite2D, Texture, Node } from "webgl2-engine";


var wobble_quat = new Quat();

var rotation_quat = new Quat();

function update(engine:Engine, time:number, delta_time:number) {

    const im:InputManager = engine.input_manager;

    const pirate_ship:Object3D|null = engine.get_node("pirate_ship") as Object3D|null;

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

    shader_prog_3d.add_uniform("base_texture", WebGLUniformType.TEXTURE_2D);

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

    const skybox_texture = new CubeMapTexture(gm,
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/top.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/bottom.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/front.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/back.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/left.jpg"),
        await engine.UTIL.load_image("/assets/skyboxes/learnopengl/right.jpg"),
    {}, 0);

    const planet_texture = new Texture(gm, await engine.UTIL.load_image("/assets/sprites/planet.png"), {}, 0)

    engine.root_node = new Skybox(engine, "default_skybox", skybox_texture, shader_prog_skybox);

    const pirate_ship_model = await pirate_ship_model_promise;

    if (!pirate_ship_model)
        throw new Error("Failed to load pirate ship model.")

    pirate_ship_model.set_shader_program(shader_prog_3d);

    const pirate_ship = new Object3D(engine, "pirate_ship", pirate_ship_model);

    const overlay_node = new Node(engine, "overlay")

    const planet_sprite = new Sprite2D(engine, "planet", shader_prog_2d, planet_texture);

    planet_sprite.scale = new Vec2(100);

    planet_sprite.position = new Vec2(canvas.clientWidth / 2, canvas.clientHeight / 2)


    engine.root_node.push_child(pirate_ship);

    engine.root_node.push_child(overlay_node);

    overlay_node.push_child(planet_sprite);
    

    engine.main_camera.position = (new Vec3(0, 2, 5)).mul(70);
}

const canvas: HTMLCanvasElement = document.getElementById("render-canvas") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var engine = new Engine(canvas, startup, update);

engine.start();
