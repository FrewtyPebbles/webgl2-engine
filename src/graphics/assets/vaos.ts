import { Vec3 } from "@vicimpa/glm";
import Engine from "../../engine.ts";
import { GraphicsManager } from "../graphics_manager.ts";

var skybox_VAO:WebGLVertexArrayObject|null = null
var skybox_VAO_index_count:number = 0;
var skybox_VAO_vertex_count:number = 0;

var sprite_VAO:WebGLVertexArrayObject|null = null
var sprite_VAO_index_count:number = 0;
var sprite_VAO_vertex_count:number = 0;

export interface VAOInfo {
    vao:WebGLVertexArrayObject;
    index_count:number;
    vertex_count:number;
}

export function get_skybox_vao(gm:GraphicsManager):VAOInfo {
    if (skybox_VAO)
        return {vao:skybox_VAO, index_count:skybox_VAO_index_count, vertex_count:skybox_VAO_vertex_count};
    
    const cube_vertices = new Float32Array([
        -1, -1, -1, // 0
         1, -1, -1, // 1
         1,  1, -1, // 2
        -1,  1, -1, // 3
        -1, -1,  1, // 4
         1, -1,  1, // 5
         1,  1,  1, // 6
        -1,  1,  1  // 7
    ]);

    const cube_indices = new Uint16Array([
        0,1,2, 2,3,0, // -Z
        4,5,6, 6,7,4, // +Z
        0,4,7, 7,3,0, // -X
        1,5,6, 6,2,1, // +X
        3,2,6, 6,7,3, // +Y
        0,1,5, 5,4,0  // -Y
    ]);

    skybox_VAO_vertex_count = cube_vertices.length;

    skybox_VAO_index_count = cube_indices.length;

    skybox_VAO = gm.gl.createVertexArray()!;
    gm.gl.bindVertexArray(skybox_VAO);

    // Vertex buffer
    const vbo = gm.gl.createBuffer()!;
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, vbo);
    gm.gl.bufferData(gm.gl.ARRAY_BUFFER, cube_vertices, gm.gl.STATIC_DRAW);

    // Position attribute (location 0)
    gm.gl.enableVertexAttribArray(0);
    gm.gl.vertexAttribPointer(0, 3, gm.gl.FLOAT, false, 0, 0);

    // Index buffer
    const ibo = gm.gl.createBuffer()!;
    gm.gl.bindBuffer(gm.gl.ELEMENT_ARRAY_BUFFER, ibo);
    gm.gl.bufferData(gm.gl.ELEMENT_ARRAY_BUFFER, cube_indices, gm.gl.STATIC_DRAW);

    // Unbind VAO
    gm.gl.bindVertexArray(null);
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, null);

    return {vao:skybox_VAO, index_count:skybox_VAO_index_count, vertex_count:skybox_VAO_vertex_count};
}

export function get_sprite_vao(gm:GraphicsManager):VAOInfo {
    if (sprite_VAO)
        return {vao:sprite_VAO, index_count:sprite_VAO_index_count, vertex_count:sprite_VAO_vertex_count};
    
    const quad_vertices = new Float32Array([
        -0.5, -0.5, 0.0,         0.0, 0.0,  // bottom left
         0.5, -0.5, 0.0,         1.0, 0.0,  // bottom right
         0.5,  0.5, 0.0,         1.0, 1.0,  // top right
        -0.5,  0.5, 0.0,         0.0, 1.0   // top left
    ]);

    const quad_indices = new Uint16Array([
        0, 1, 2, // First triangle
        2, 3, 0  // Second triangle
    ]);

    sprite_VAO_vertex_count = quad_vertices.length / 5;

    sprite_VAO_index_count = quad_indices.length;

    sprite_VAO = gm.gl.createVertexArray();
    gm.gl.bindVertexArray(sprite_VAO);

    // Create and bind VBO
    const vbo = gm.gl.createBuffer();
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, vbo);
    gm.gl.bufferData(gm.gl.ARRAY_BUFFER, quad_vertices, gm.gl.STATIC_DRAW);

    // Setup vertex attributes
    const stride = 5 * Float32Array.BYTES_PER_ELEMENT; // 5 floats per vertex
    
    // Position attribute (location 0)
    gm.gl.enableVertexAttribArray(0);
    gm.gl.vertexAttribPointer(
        0, // attribute location
        3, // number of components (x, y, z)
        gm.gl.FLOAT, // data type
        false, // normalize
        stride, // stride
        0 // offset
    );

    // TexCoord attribute (location 1)
    gm.gl.enableVertexAttribArray(1);
    gm.gl.vertexAttribPointer(
        1, // attribute location
        2, // number of components (u, v)
        gm.gl.FLOAT, // data type
        false, // normalize
        stride, // stride
        3 * Float32Array.BYTES_PER_ELEMENT // offset (skip x, y, z)
    );

    // Create and bind EBO
    const ebo = gm.gl.createBuffer();
    gm.gl.bindBuffer(gm.gl.ELEMENT_ARRAY_BUFFER, ebo);
    gm.gl.bufferData(gm.gl.ELEMENT_ARRAY_BUFFER, quad_indices, gm.gl.STATIC_DRAW);

    // Unbind VAO
    gm.gl.bindVertexArray(null);
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, null);


    return {vao:sprite_VAO, index_count:sprite_VAO_index_count, vertex_count:sprite_VAO_vertex_count};
}