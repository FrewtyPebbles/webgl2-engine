import { Mat3, Mat4, Quat, Vec3 } from "@vicimpa/glm";
import { load_obj } from "./graphics/asset_loaders/obj";
import GraphicsManager, { WebGLUniformType } from "./graphics/graphics_manager";
import { Object3D } from "./graphics/node_extensions";

async function load_shader_file(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return await response.text();
}

function update(gm:GraphicsManager) {
    const pirate_ship:Object3D = gm.root_node.children[0] as Object3D;
    pirate_ship.rotation = pirate_ship.rotation.rotateY(0.01);
}

async function graphics_main() {
    const canvas: HTMLCanvasElement = document.getElementById("render-canvas") as HTMLCanvasElement;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gm:GraphicsManager = new GraphicsManager(canvas);

    if (!gm.webgl_enabled()) {
        throw new Error("WebGL2 is not enabled!");
    }


    const shader_prog_3d = gm.create_shader_program("3D");

    const pirate_ship_model_promise = load_obj(gm, "/assets/test_models/pirate_ship/source/pirate_ship.obj", [
        "/assets/test_models/pirate_ship/textures/pirate_ship.png"
    ]);

    shader_prog_3d.add_shader(gm.gl.VERTEX_SHADER, await load_shader_file("/assets/default_vertex.vs"));
    shader_prog_3d.add_shader(gm.gl.FRAGMENT_SHADER, await load_shader_file("/assets/default_fragment.fs"));

    shader_prog_3d.add_uniform("u_model", WebGLUniformType.F4M);
    shader_prog_3d.add_uniform("u_view", WebGLUniformType.F4M);
    shader_prog_3d.add_uniform("u_projection", WebGLUniformType.F4M);

    shader_prog_3d.add_uniform("albedo_texture", WebGLUniformType.TEXTURE_2D);

    shader_prog_3d.build()

    const pirate_ship_model = await pirate_ship_model_promise;

    if (!pirate_ship_model)
        throw new Error("Failed to load pirate ship model.")

    pirate_ship_model.set_shader_program(shader_prog_3d);

    const pirate_ship = new Object3D(gm, pirate_ship_model);

    gm.root_node.push_child(pirate_ship);

    gm.main_camera.position = (new Vec3(0, 2, 5)).mul(70);

    gm.main_camera.rotation = (new Quat()).fromMat3((new Mat3()).fromMat4((new Mat4()).lookAt(gm.main_camera.position, pirate_ship.position.sub(new Vec3(0,-100,0)), new Vec3(0,1,0))));

    gm.render(update);
}

graphics_main();
