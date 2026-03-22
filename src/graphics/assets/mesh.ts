import { Vec3 } from "@vicimpa/glm";
import { GraphicsManager } from "../graphics_manager";

export class Mesh {
    gm: GraphicsManager;
    vao: WebGLVertexArrayObject;
    vertexCount: number;
    indexCount: number;
    dimensions: Vec3;
    center: Vec3;

    constructor(
        gm: GraphicsManager,
        vertices: Float32Array|number[],    // xyz
        normals: Float32Array|number[],     // xyz
        uvs: Float32Array|number[],         // uv
        indices: Uint16Array|number[],       // triangle indices
        dimensions: Vec3,
        center: Vec3,
    ) {
        this.gm = gm
        this.vertexCount = vertices.length / 3;
        this.indexCount = indices.length;
        this.dimensions = dimensions;
        this.center = center;

        // Create buffers
        const vboPositions = gm.gl.createBuffer()!;
        const vboNormals = gm.gl.createBuffer()!;
        const vboUVs = gm.gl.createBuffer()!;
        const ibo = gm.gl.createBuffer()!;

        // Create VAO
        this.vao = gm.gl.createVertexArray()!;
        gm.gl.bindVertexArray(this.vao);

        // Positions
        gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, vboPositions);
        gm.gl.bufferData(gm.gl.ARRAY_BUFFER, vertices as Float32Array, gm.gl.STATIC_DRAW);
        gm.gl.enableVertexAttribArray(0); // location 0 in shader
        gm.gl.vertexAttribPointer(0, 3, gm.gl.FLOAT, false, 0, 0);

        // Normals
        gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, vboNormals);
        gm.gl.bufferData(gm.gl.ARRAY_BUFFER, normals as Float32Array, gm.gl.STATIC_DRAW);
        gm.gl.enableVertexAttribArray(1); // location 1 in shader
        gm.gl.vertexAttribPointer(1, 3, gm.gl.FLOAT, false, 0, 0);

        // UVs
        gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, vboUVs);
        gm.gl.bufferData(gm.gl.ARRAY_BUFFER, uvs as Float32Array, gm.gl.STATIC_DRAW);
        gm.gl.enableVertexAttribArray(2); // location 2 in shader
        gm.gl.vertexAttribPointer(2, 2, gm.gl.FLOAT, false, 0, 0);

        // Indices
        gm.gl.bindBuffer(gm.gl.ELEMENT_ARRAY_BUFFER, ibo);
        gm.gl.bufferData(gm.gl.ELEMENT_ARRAY_BUFFER, indices as Uint16Array, gm.gl.STATIC_DRAW);

        // Unbind VAO
        gm.gl.bindVertexArray(null);
    }

    draw() {
        this.gm.gl.bindVertexArray(this.vao);
        this.gm.gl.drawElements(this.gm.gl.TRIANGLES, this.indexCount, this.gm.gl.UNSIGNED_SHORT, 0);
        this.gm.gl.bindVertexArray(null);
    }
}