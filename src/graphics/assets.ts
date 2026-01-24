import { GraphicsManager, ShaderProgram } from "./graphics_manager.ts";

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

    // Indices for 12 triangles (36 elements)
    const cube_indices = new Uint16Array([
        0,1,2, 2,3,0,   // -Z
        4,5,6, 6,7,4,   // +Z
        0,4,7, 7,3,0,   // -X
        1,5,6, 6,2,1,   // +X
        3,2,6, 6,7,3,   // +Y
        0,1,5, 5,4,0    // -Y
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

    // Unbind VAO (good practice)
    gm.gl.bindVertexArray(null);
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, null);

    return {vao:skybox_VAO, index_count:skybox_VAO_index_count, vertex_count:skybox_VAO_vertex_count};
}

export function get_sprite_vao(gm:GraphicsManager):VAOInfo {
    if (sprite_VAO)
        return {vao:sprite_VAO, index_count:sprite_VAO_index_count, vertex_count:sprite_VAO_vertex_count};
    
    const quad_vertices = new Float32Array([
        -0.5, -0.5, 0.0,         0.0, 0.0,  // Bottom-left
         0.5, -0.5, 0.0,         1.0, 0.0,  // Bottom-right
         0.5,  0.5, 0.0,         1.0, 1.0,  // Top-right
        -0.5,  0.5, 0.0,         0.0, 1.0   // Top-left
    ]);

    const quad_indices = new Uint16Array([
        0, 1, 2,  // First triangle
        2, 3, 0   // Second triangle
    ]);

    sprite_VAO_vertex_count = quad_vertices.length / 5;

    sprite_VAO_index_count = quad_indices.length;

    sprite_VAO = gm.gl.createVertexArray();
    gm.gl.bindVertexArray(sprite_VAO);

    // Create and bind VBO (Vertex Buffer Object)
    const vbo = gm.gl.createBuffer();
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, vbo);
    gm.gl.bufferData(gm.gl.ARRAY_BUFFER, quad_vertices, gm.gl.STATIC_DRAW);

    // Setup vertex attributes
    const stride = 5 * Float32Array.BYTES_PER_ELEMENT; // 5 floats per vertex
    
    // Position attribute (location 0)
    gm.gl.enableVertexAttribArray(0);
    gm.gl.vertexAttribPointer(
        0,                              // attribute location
        3,                              // number of components (x, y, z)
        gm.gl.FLOAT,                       // data type
        false,                          // normalize
        stride,                         // stride (bytes between vertices)
        0                               // offset
    );

    // TexCoord attribute (location 1)
    gm.gl.enableVertexAttribArray(1);
    gm.gl.vertexAttribPointer(
        1,                              // attribute location
        2,                              // number of components (u, v)
        gm.gl.FLOAT,                       // data type
        false,                          // normalize
        stride,                         // stride
        3 * Float32Array.BYTES_PER_ELEMENT  // offset (skip x, y, z)
    );

    // Create and bind EBO (Element Buffer Object)
    const ebo = gm.gl.createBuffer();
    gm.gl.bindBuffer(gm.gl.ELEMENT_ARRAY_BUFFER, ebo);
    gm.gl.bufferData(gm.gl.ELEMENT_ARRAY_BUFFER, quad_indices, gm.gl.STATIC_DRAW);

    // Unbind VAO (good practice)
    gm.gl.bindVertexArray(null);
    gm.gl.bindBuffer(gm.gl.ARRAY_BUFFER, null);


    return {vao:sprite_VAO, index_count:sprite_VAO_index_count, vertex_count:sprite_VAO_vertex_count};
}

export class Mesh {
    gm: GraphicsManager;
    vao: WebGLVertexArrayObject;
    vertexCount: number;
    indexCount: number;

    constructor(
        gm: GraphicsManager,
        vertices: Float32Array|number[],    // xyz
        normals: Float32Array|number[],     // xyz
        uvs: Float32Array|number[],         // uv
        indices: Uint16Array|number[]       // triangle indices
    ) {
        this.gm = gm
        this.vertexCount = vertices.length / 3;
        this.indexCount = indices.length;

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

const UNSIGNED_BYTE = 5121;

export enum TextureType {
    DEFAULT,
    DEPTH
}

export class Texture {
    gm:GraphicsManager;
    webgl_texture: WebGLTexture;


    // CONSTRUCTOR A
    constructor(gm:GraphicsManager, width:number, height:number, texture_type:TextureType);
    constructor(gm:GraphicsManager, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number});
    constructor(gm:GraphicsManager, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, image_type:number);


    // CONSTRUCTOR B
    constructor(gm:GraphicsManager, image:TexImageSource, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number});
    constructor(gm:GraphicsManager, image:TexImageSource, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number);
    constructor(gm:GraphicsManager, image:TexImageSource, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number);

    constructor(gm:GraphicsManager, arg1:any, arg2:any, arg3?:any|undefined, arg4?:any|undefined, arg5?:any|undefined) {
        this.gm = gm;

        if (typeof arg1 === 'number' && typeof arg2 === 'number') {
            // CONSTRUCTOR A
            const width = arg1 as number;
            const height = arg2 as number;
            const texture_type = arg3 ? arg3 as TextureType : TextureType.DEFAULT;
            const texture_parameters = arg4 ? arg4 as {[parameter_name:number]:number} : {};
            let fallback_image_type:number = this.gm.gl.UNSIGNED_BYTE;
            switch (texture_type) {
                case TextureType.DEFAULT:
                    fallback_image_type = this.gm.gl.UNSIGNED_BYTE;
                    break;
                case TextureType.DEPTH:
                    fallback_image_type = this.gm.gl.UNSIGNED_INT;
                    break;
            }
            const image_type = arg5 ? arg5 as number : fallback_image_type;

            this.webgl_texture = this.create_texture(null, texture_type, texture_parameters, 0, image_type, width, height);
        } else {
            // CONSTRUCTOR B
            const image = arg1 as TexImageSource;
            const texture_type = arg2 as TextureType;
            const texture_parameters = arg3 === undefined ? {} : arg3 as {[parameter_name:number]:number};
            const mip_level = arg4 === undefined ? 0 : arg3 as number;
            const image_type = arg5 === undefined ? this.gm.gl.UNSIGNED_BYTE : arg5 as number;
            this.webgl_texture = this.create_texture(image, texture_type, texture_parameters, mip_level, image_type);
        }
    }

    create_texture(image:TexImageSource|null, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE, width:number = 0, height:number = 0):WebGLTexture {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        var internal_format = 0;
        var format = 0;
        var do_generate_mipmap = false;
        switch (texture_type) {
            case TextureType.DEFAULT:
                internal_format = this.gm.gl.RGBA;
                format = this.gm.gl.RGBA;
                do_generate_mipmap = true;
                break;
            case TextureType.DEPTH:
                internal_format = this.gm.gl.DEPTH_COMPONENT24;
                format = this.gm.gl.DEPTH_COMPONENT;
                do_generate_mipmap = false;
                break;
        }

        if (image === null)
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                mip_level,
                internal_format,
                width,
                height,
                0,
                format,
                image_type,
                null
            );
        else
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                mip_level,
                internal_format,
                format,
                image_type,
                image as TexImageSource
            );
        
        if (do_generate_mipmap)
            this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_2D);
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D, parameter_name, parameter_value);
        }
        return texture;
    }
}

export class CubeMapTexture {
    gm:GraphicsManager;
    texture: WebGLTexture;

    constructor(gm:GraphicsManager,
        image_top:TexImageSource,
        image_bottom:TexImageSource,
        image_front:TexImageSource,
        image_back:TexImageSource,
        image_left:TexImageSource,
        image_right:TexImageSource,
    texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = UNSIGNED_BYTE) {
        this.gm = gm;
        this.texture = this.create_texture([
            image_right,
            image_left,
            image_top,
            image_bottom,
            image_front,
            image_back
        ], texture_parameters, mip_level, image_type);
    }

    create_texture(images:TexImageSource[], texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE):WebGLTexture {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_CUBE_MAP, texture);

        const targets = [
            this.gm.gl.TEXTURE_CUBE_MAP_POSITIVE_X, // right
            this.gm.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, // left
            this.gm.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, // top
            this.gm.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, // bottom
            this.gm.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, // front
            this.gm.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, // back
        ];


        targets.forEach((target, i) => {
            this.gm.gl.bindTexture(this.gm.gl.TEXTURE_CUBE_MAP, texture);
            this.gm.gl.texImage2D(target, mip_level, this.gm.gl.RGBA, this.gm.gl.RGBA, image_type, images[i]);
            this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_CUBE_MAP);
        });
        
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_MIN_FILTER, this.gm.gl.LINEAR_MIPMAP_LINEAR);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_MAG_FILTER, this.gm.gl.LINEAR);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_WRAP_S, this.gm.gl.CLAMP_TO_EDGE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_WRAP_T, this.gm.gl.CLAMP_TO_EDGE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_WRAP_R, this.gm.gl.CLAMP_TO_EDGE);
        
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, parameter_name, parameter_value);
        }
        return texture;
    }
}

type TextureTypes = Texture|CubeMapTexture;

export interface ModelOptionsObject {
    enable_depth_test?:boolean;
}

type TexturesMap = {
    base_texture?: TextureTypes;
    skybox_texture?: TextureTypes;
    [key: string]: TextureTypes | undefined;
};

export class Model {
    gm:GraphicsManager;
    mesh:Mesh;
    shader_program:ShaderProgram|null;
    textures:TexturesMap = {};

    // OPTIONS
    enable_depth_test:boolean = true;

    constructor(
        gm:GraphicsManager,
        mesh:Mesh,
        textures:TexturesMap = {},
        options:ModelOptionsObject = {},
        shader_program:string|ShaderProgram|null = null
    ) {
        this.gm = gm;
        if(shader_program) {
            if (shader_program instanceof ShaderProgram) {
                this.shader_program = shader_program;
            } else {
                this.shader_program = gm.shader_programs[shader_program];
            }
        } else {
            this.shader_program = null;
        }
        this.mesh = mesh;
        this.textures = textures;

        if (options.enable_depth_test !== undefined)
            this.enable_depth_test = options.enable_depth_test;
    }

    set_shader_program(shader_program:string|ShaderProgram) {
        if (shader_program instanceof ShaderProgram) {
            this.shader_program = shader_program;
        } else {
            this.shader_program = this.gm.shader_programs[shader_program];
        }
    }

    add_texture(uniform_name:string, texture:Texture) {
        this.textures[uniform_name] = texture;
    }

    draw_start() {
        if (!this.shader_program)
            throw Error(`Shader program not set for model.`);
        
        if (this.enable_depth_test)
            this.gm.gl.enable(this.gm.gl.DEPTH_TEST);
        else
            this.gm.gl.disable(this.gm.gl.DEPTH_TEST);

        this.shader_program.use();
        for (const [label, texture] of Object.entries(this.textures)) {
            this.gm.set_uniform(label, texture);
        }
    }

    draw_end() {
        this.mesh.draw();

        if (this.enable_depth_test)
            this.gm.gl.disable(this.gm.gl.DEPTH_TEST);

        this.gm.clear_shader()

    }
}