import { Vec3 } from "@vicimpa/glm";
import { GraphicsManager } from "../../graphics_manager.ts";
import { Texture, TextureType } from "../texture.ts";
import { Model } from "../model.ts";
import { Material } from "../material.ts";
import { Mesh } from "../mesh.ts";



interface OBJData {
    vertices: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint16Array;
    dimensions:Vec3;
    center:Vec3;
}

async function parse_obj(text: string): Promise<OBJData> {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const temp_vertices: number[][] = [];
    const temp_normals: number[][] = [];
    const temp_uvs: number[][] = [];

    const vertex_map = new Map<string, number>(); // maps "v/vt/vn" to index

    var [min_x, min_y, min_z] = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
    var [max_x, max_y, max_z] = [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE];

    const lines = text.split("\n");
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0) continue;

        switch(parts[0]) {
            case "v":
                const [x, y, z] = parts.slice(1).map(Number);
                
                min_x = x < min_x ? x : min_x;
                min_y = y < min_y ? y : min_y;
                min_z = z < min_z ? z : min_z;

                max_x = x > max_x ? x : max_x;
                max_y = y > max_y ? y : max_y;
                max_z = z > max_z ? z : max_z;

                temp_vertices.push([x, y, z]);
                break;
            case "vn":
                temp_normals.push(parts.slice(1).map(Number));
                break;
            case "vt":
                temp_uvs.push(parts.slice(1).map(Number));
                break;
            case "f":
                // Each face can be triangles or quads
                const face_verts = parts.slice(1);
                const face_indices: number[] = [];

                for (const fv of face_verts) {
                    if (!vertex_map.has(fv)) {
                        const [vIdx, vtIdx, vnIdx] = fv.split("/").map(s => parseInt(s));
                        const pos = temp_vertices[vIdx - 1];
                        positions.push(...pos);
                        if (vtIdx && temp_uvs[vtIdx - 1]) uvs.push(...temp_uvs[vtIdx - 1]);
                        else uvs.push(0, 0);
                        if (vnIdx && temp_normals[vnIdx - 1]) normals.push(...temp_normals[vnIdx - 1]);
                        else normals.push(0, 0, 0);
                        const index = (positions.length / 3) - 1;
                        vertex_map.set(fv, index);
                        face_indices.push(index);
                    } else {
                        face_indices.push(vertex_map.get(fv)!);
                    }
                }

                // Triangulate quads if necessary
                if (face_indices.length === 3) {
                    indices.push(...face_indices);
                } else if (face_indices.length === 4) {
                    indices.push(face_indices[0], face_indices[1], face_indices[2]);
                    indices.push(face_indices[0], face_indices[2], face_indices[3]);
                }
                break;
        }
    }

    return {
        vertices: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices),
        dimensions: new Vec3(max_x - min_x, max_y - min_y, max_z - min_z),
        center: new Vec3((max_x + min_x)/2.0, (max_y + min_y)/2.0, (max_z + min_z)/2.0),
    };
}

export async function load_obj(gm:GraphicsManager, model_path:string, image_asset_paths:string[]):Promise<Model|null> {
    var image_assets:Texture[] = [];

    const vertexMap = new Map<string, number>();

    for (const image_asset_path of image_asset_paths) {
        const res = await fetch(image_asset_path);
        if (res.ok) {
            const blob = await res.blob();
            image_assets.push(new Texture(gm, await createImageBitmap(blob, { imageOrientation: 'flipY' }), TextureType.COLOR, {}));
        } else {
            throw new Error(`The .obj image asset file at "${image_asset_path}" does not exist.`);
        }
    }


    // Parse the mesh file
    const res = await fetch(model_path);
    if (res.ok) {
        const raw_text = await res.text();
        var obj = await parse_obj(raw_text);
    } else {
        throw new Error(`The .obj file at "${model_path}" does not exist.`);
    }

    // Build the model
    var mesh = new Mesh(gm, obj.vertices, obj.normals, obj.uvs, obj.indices, obj.dimensions, obj.center);
    var material = new Material(gm, "default", image_assets[0], 0.0, 0.0, 0.0, null, gm.default_3d_shader_program);
    var model = new Model(gm, mesh, material);

    return model;
}