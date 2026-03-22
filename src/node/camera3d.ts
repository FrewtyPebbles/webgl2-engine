import { Mat4 } from "@vicimpa/glm";
import { Node3D } from "../node";
import { degrees_to_radians } from "../graphics/utility";


export class Camera3D extends Node3D {
    fov:number = degrees_to_radians(60);
    near_plane:number = 0.1;
    far_plane:number = 1000.0;

    get_projection_matrix(canvas:HTMLCanvasElement): Mat4 {
        const aspect = canvas.width / canvas.height;

        return new Mat4().perspectiveNO(
            this.fov,
            aspect,
            this.near_plane,
            this.far_plane
        );
    }

    get_view_matrix(): Mat4 {
        const view = new Mat4().identity();

        // Inverse rotation
        const invRot = this.rotation.clone().invert();
        view.mul(new Mat4().fromQuat(invRot));

        // Inverse translation
        view.translate(this.position.clone().negate());

        return view;
    }
}