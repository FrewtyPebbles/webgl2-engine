import GraphicsManager, { ShaderProgram } from "./graphics_manager";

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

export class Texture {
    gm:GraphicsManager;
    texture: WebGLTexture;

    constructor(gm:GraphicsManager, image:TexImageSource, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = UNSIGNED_BYTE) {
        this.gm = gm;
        this.texture = this.create_texture(image, texture_parameters, mip_level, image_type);
    }

    create_texture(image:TexImageSource, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE):WebGLTexture {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        this.gm.gl.texImage2D(
            this.gm.gl.TEXTURE_2D,
            mip_level,
            this.gm.gl.RGBA,
            this.gm.gl.RGBA,
            this.gm.gl.UNSIGNED_BYTE,
            image
        );
        this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_2D);
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D, parameter_name, parameter_value);
        }
        return texture;
    }
}

export class Model {
    gm:GraphicsManager;
    mesh:Mesh;
    shader_program:ShaderProgram|null;
    textures:{[key:string]:Texture} = {};

    constructor(
        gm:GraphicsManager,
        mesh:Mesh,
        albedo_texture:Texture,
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
        this.textures["albedo_texture"] = albedo_texture;
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
        this.shader_program.use();
        for (const [label, texture] of Object.entries(this.textures)) {
            this.gm.set_uniform(label, texture);
        }
    }

    draw_end() {
        this.mesh.draw();
    }
}