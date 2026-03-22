import { Vec3 } from "@vicimpa/glm";
import { GraphicsManager } from "../../graphics_manager";
import { Texture, TextureType } from "../texture";
import { Model } from "../model";
import { Material } from "../material";
import { Mesh } from "../mesh";
import { Node3D } from "../../../node";
import Engine from "../../../engine";
import { Object3D } from "../../../node/object3d";
import { parse_path, join_path, basename_path, dirname_path } from "../../utility";


export namespace AssetFile {
    export namespace OBJ {
        export interface Data {
            temp?: {
                // "temp" holds the state of the data while it is being created.
                // When the data is finalized, the temp attribute is deleted
                // or set to undefined.
                vertices: number[][];
                normals: number[][];
                uvs: number[][];
                min_x:number;
                min_y:number;
                min_z:number;
                max_x:number;
                max_y:number;
                max_z:number;
                vertex_map:Map<string, number>;
                vertices_final: number[];
                normals_final: number[];
                uvs_final: number[];
                indices_final: number[];
            },
            vertices: Float32Array;
            normals: Float32Array;
            uvs: Float32Array;
            indices: Uint16Array;
            dimensions:Vec3;
            center:Vec3;
        }

        export enum BumpChannel {
            RED = "r",
            GREEN = "g",
            BLUE = "b",
            MATTE = "m",
            LUMINANCE = "l",
            Z_DEPTH = "z"
        }

        export enum ReflectionMapType {
            SPHERE = "sphere",
            CUBE_TOP = "cube_top",
            CUBE_BOTTOM = "cube_bottom",
            CUBE_FRONT = "cube_front",
            CUBE_BACK = "cube_back",
            CUBE_LEFT = "cube_left",
            CUBE_RIGHT = "cube_right"
        }

        export interface TextureData {
            name:string;
            // -blendu
            horizontal_blend?:boolean;
            // -blendv
            vertical_blend?:boolean;
            // -boost
            mip_map_sharpness_boost?:number;
            // -mm
            additive_color_offset?:number;
            contrast_multiplier?:number;
            // -o
            offset?:Vec3;
            // -s
            scale?:Vec3;
            // -t
            turbulence?:Vec3;
            // -texres
            generated_texture_resolution?:number;
            // -clamp
            clamp?:boolean;
            // -bm
            bump_multiplier?:number;
            // -imfchan
            bump_channel?:BumpChannel;
            // -type
            reflection_map_type?:ReflectionMapType;
        }

        export enum IlluminationModel {
            COLOR_ON_AMBIENT_OFF,
            COLOR_ON_AMBIENT_ON,
            HIGHLIGHT_ON,
            REFLECTION_ON_RAY_TRACE_ON,
            TRANSPARENCY_GLASS_ON__REFLECTION_RAY_TRACE_ON,
            REFLECTION_FRESNEL_ON_RAY_TRACE_ON,
            TRANSPARENCY_REFRACTION_ON__REFLECTION_FRESNEL_OFF_RAY_TRACE_ON,
            TRANSPARENCY_REFRACTION_ON__REFLECTION_FRESNEL_ON_RAY_TRACE_ON,
            REFLECTION_ON_RAY_TRACE_OFF,
            TRANSPARENCY_GLASS_ON__REFLECTION_RAY_TRACE_OFF,
            CAST_SHADOWS_ON_INVISIBLE_SURFACES,
        }

        export interface MaterialData {
            name:string;
            ambient_color?:Vec3;
            diffuse_color?:Vec3;
            specular_color?:Vec3;
            specular_exponent?:number;
            transparency?:number;
            transmission_filter_color?:Vec3;
            transmission_filter_xyz?:boolean;
            optical_density?:number;
            illumination_model?:IlluminationModel;
            ambient_texture?:TextureData;
            diffuse_texture?:TextureData;
            specular_color_texture?:TextureData;
            specular_highlight_texture?:TextureData;
            alpha_texture?:TextureData;
            bump_texture?:TextureData;
            displacement_texture?:TextureData;
            decal_texture?:TextureData;
            reflection_textures?:TextureData[];// This is for if each side of a cube map uses a different refl statement
            // PBR
            roughness_texture?:TextureData;
            metalic_texture?:TextureData;
            sheen_texture?:TextureData;
            roughness?:number;
            metalic?:number;
            sheen?:number;
            clearcoat_thickness?:number;
            clearcoat_roughness?:number;
            emissive_texture?:TextureData;
            emissive?:number;
            anisotropy?:number;
            anisotropy_rotation?:number;
            normal_texture?:TextureData;
        }

        // There will be at least 1 object per file.
        // This object will be named the same as the object
        // file with the extension removed and be created only 
        // if there are no specified objects or groups.
        export interface Object {
            name:string;
            data?:Data;
            material?:string;
            groups:Group[];
        }

        // Every object will have at least one group.  If a group is unnamed then it is the default group
        export interface Group {
            name:string;
            data:Data;
            material?:string;
        }

        enum CollectionType {
            OBJECT,
            GROUP
        }

        function create_material(engine:Engine, material_data:MaterialData, image_assets_path:string, image_assets:Map<string, Texture>):Material {
            const get_fallback = (...fallbacks:any[]) => {
                for (const fallback of fallbacks) {
                    if (fallback !== undefined)
                        return fallback;
                }
                throw new Error("A valid defined fallback was not supplied.")
            }
            
            return new Material(
                engine.graphics_manager,
                material_data.name,
                get_fallback(
                    material_data.diffuse_texture?.name ?
                    image_assets.get(material_data.diffuse_texture?.name)
                    : undefined,
                    material_data.diffuse_color,
                    new Vec3(1.0)
                ),
                get_fallback(
                    material_data.metalic_texture?.name ?
                    image_assets.get(material_data.metalic_texture?.name)
                    : undefined,
                    material_data.metalic,
                    0.0
                ),
                get_fallback(
                    material_data.roughness_texture?.name ?
                    image_assets.get(material_data.roughness_texture?.name)
                    : undefined,
                    material_data.roughness,
                    0.0
                ),
                get_fallback(
                    material_data.ambient_texture?.name ?
                    image_assets.get(material_data.ambient_texture?.name)
                    : undefined,
                    0.0
                ),
                get_fallback(
                    material_data.normal_texture?.name ?
                    image_assets.get(material_data.normal_texture?.name)
                    : undefined,
                    null
                ),
                engine.graphics_manager.default_3d_shader_program
            );
        }

        export async function load_obj(engine:Engine, obj_path:string, image_assets_path:string):Promise<Node3D> {
            const obj_name = parse_path(obj_path).name;
            var image_assets:Map<string, Texture> = new Map();
            var material_assets:Map<string, Material> = new Map();
            var obj_root_node:Node3D = new Node3D(engine, obj_name + "_root")

            // Load File
            const res = await fetch(obj_path);
            if (res.ok) {
                const raw_text = await res.text();
                const [objects, materials] = await Parser.parse_obj(engine, obj_path, raw_text, image_assets_path, image_assets);

                // parse materials
                for (const material_data of materials) {
                    const material = create_material(engine, material_data, image_assets_path, image_assets);
                    material_assets.set(material.name, material);
                }

                for (const object_data of objects) {
                    var object:Node3D
                    if (object_data.data) {
                        const data = object_data.data;
                        const mesh = new Mesh(engine.graphics_manager, data.vertices, data.normals, data.uvs, data.indices, data.dimensions, data.center);
                        var material:Material|undefined;
                        if (object_data.material) {
                            material = material_assets.get(object_data.material);
                            
                            if (material === undefined) {
                                throw new Error(`Failed to find the material named "${object_data.material}" associated with the object named "${object_data.name}" in the .obj file at "${obj_path}" when attempting to load the obj model.`)
                            }
                        } else {
                            material = new Material(engine.graphics_manager, "default", new Vec3(0.0), 0.0, 0.0, 0.0, null, engine.graphics_manager.default_3d_shader_program);
                        }
                        var model = new Model(engine.graphics_manager, "default", mesh, material);
                        object = new Object3D(engine, object_data.name, model);
                    } else {
                        object = new Node3D(engine, object_data.name);
                    }
                    // add groups as children of object
                    for (const group_data of object_data.groups) {
                        const data = group_data.data;
                        const mesh = new Mesh(engine.graphics_manager, data.vertices, data.normals, data.uvs, data.indices, data.dimensions, data.center);
                        var material:Material|undefined;
                        if (group_data.material) {
                            material = material_assets.get(group_data.material);

                            if (material === undefined) {
                                throw new Error(`Failed to find the material named "${group_data.material}" associated with the group named "${group_data.name}" object named "${object_data.name}" in the .obj file at "${obj_path}" when attempting to load the obj model.`)
                            }
                        } else {
                            material = new Material(engine.graphics_manager, "default", new Vec3(0.0), 0.0, 0.0, 0.0, null, engine.graphics_manager.default_3d_shader_program);
                        }
                        var model = new Model(engine.graphics_manager, "default", mesh, material);
                        object.push_child(new Object3D(engine, group_data.name, model));
                    }
                    // add object to root
                    obj_root_node.push_child(object);
                }

            } else {
                throw new Error(`The .obj file at "${obj_path}" does not exist.`);
            }

            return obj_root_node;
        }
        
        class Parser {
            
            static create_group(name:string):OBJ.Group {
                return {
                    name,
                    data: Parser.create_data()
                }
            }

            static create_object(name:string):OBJ.Object {
                return {
                    name,
                    groups:[]
                }
            }

            static create_data():OBJ.Data {
                return {
                    temp: {
                        min_x:Number.MAX_VALUE,
                        min_y:Number.MAX_VALUE,
                        min_z:Number.MAX_VALUE,
                        max_x:Number.MIN_VALUE,
                        max_y:Number.MIN_VALUE,
                        max_z:Number.MIN_VALUE,
                        vertices:[],
                        normals:[],
                        uvs:[],
                        vertex_map: new Map<string, number>(),
                        vertices_final:[],
                        normals_final:[],
                        uvs_final:[],
                        indices_final:[]
                    },
                    vertices: new Float32Array([]),
                    normals: new Float32Array([]),
                    uvs: new Float32Array([]),
                    indices: new Uint16Array([]),
                    dimensions:new Vec3(0.0),
                    center:new Vec3(0.0)
                };
            }

            static create_material(name:string):OBJ.MaterialData {
                return {name};
            }

            private static async load_mtl(engine:Engine, file_url:string, image_assets_path:string, image_assets:Map<string, Texture>):Promise<OBJ.MaterialData[]> {
                const res = await fetch(file_url);
                if (res.ok) {
                    const raw_text = await res.text();
                    const mtls = await Parser.parse_mtl(engine, file_url, raw_text, image_assets_path, image_assets);
                    return mtls;
                } else {
                    throw new Error(`The .mtl file at "${file_url}" does not exist.`);
                }
            }

            private static async parse_mtl(engine:Engine, file_url:string, text:string, image_assets_path:string, image_assets:Map<string, Texture>):Promise<OBJ.MaterialData[]> {
                var material_list:OBJ.MaterialData[] = [];
                var current_material:OBJ.MaterialData|null = null;

                const lines = text.split("\n");
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    switch (parts[0].toLowerCase()) {
                        case "newmtl":
                            current_material = Parser.create_material(parts[1]);
                            material_list.push(current_material);                            
                            break;

                        case "illum":
                            if (current_material) {
                                current_material.illumination_model = Number(parts[1]) as IlluminationModel;
                            }
                            break;

                        case "kd":
                            if (current_material) {
                                const [r, g, b] = parts.slice(1).map(Number);
                                current_material.diffuse_color = new Vec3(r, g, b);
                            }
                            break;

                        case "ka":
                            if (current_material) {
                                const [r, g, b] = parts.slice(1).map(Number);
                                current_material.ambient_color = new Vec3(r, g, b);
                            }
                            break;

                        case "ks":
                            if (current_material) {
                                const [r, g, b] = parts.slice(1).map(Number);
                                current_material.specular_color = new Vec3(r, g, b);
                            }
                            break;

                        case "ns":
                            if (current_material) {
                                current_material.specular_exponent = Number(parts[1]);
                            }
                            break;

                        case "d":
                            if (current_material) {
                                current_material.transparency = Number(parts[1]);
                            }
                            break;

                        case "tr":
                            if (current_material) {
                                current_material.transparency = 1.0 - Number(parts[1]);
                            }
                            break;

                        case "ni":
                            if (current_material) {
                                current_material.optical_density = Number(parts[1]);
                            }
                            break;
                        
                        case "pr":
                            if (current_material) {
                                current_material.roughness = Number(parts[1]);
                            }
                            break;

                        case "pm":
                            if (current_material) {
                                current_material.metalic = Number(parts[1]);
                            }
                            break;

                        case "ps":
                            if (current_material) {
                                current_material.sheen = Number(parts[1]);
                            }
                            break;

                        case "pc":
                            if (current_material) {
                                current_material.clearcoat_thickness = Number(parts[1]);
                            }
                            break;

                        case "pcr":
                            if (current_material) {
                                current_material.clearcoat_roughness = Number(parts[1]);
                            }
                            break;

                        case "ke":
                            if (current_material) {
                                current_material.emissive = Number(parts[1]);
                            }
                            break;

                        case "aniso":
                            if (current_material) {
                                current_material.anisotropy = Number(parts[1]);
                            }
                            break;

                        case "anisor":
                            if (current_material) {
                                current_material.anisotropy_rotation = Number(parts[1]);
                            }
                            break;

                        case "tf":
                            if (current_material) {
                                if (parts[1].includes("x", 0)) {
                                    const x = Number(parts[2]);
                                    var y:number|null = null
                                    var z:number|null = null
                                    if (parts.length >= 4)
                                        y = Number(parts[3]);
                                    if (parts.length >= 5)
                                        z = Number(parts[4]);

                                    current_material.transmission_filter_color = new Vec3(
                                        x,
                                        y !== null ? y : x,
                                        z !== null ? z : x
                                    );
                                    current_material.transmission_filter_xyz
                                } else {
                                    const [r, g, b] = parts.slice(1).map(Number);
                                    current_material.transmission_filter_color = new Vec3(r, g, b);
                                }
                            }
                            break;

                            // TEXTURE MAPS
                            case "map_ka":
                                if (current_material)
                                    current_material.ambient_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_kd":
                                if (current_material)
                                    current_material.diffuse_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_ks":
                                if (current_material)
                                    current_material.specular_color_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_ns":
                                if (current_material)
                                    current_material.specular_highlight_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_d":
                                if (current_material)
                                    current_material.alpha_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "refl":
                                if (current_material)
                                    if (current_material.reflection_textures === undefined)
                                        current_material.reflection_textures = [await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets)];
                                    else
                                        current_material.reflection_textures.push(await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets));
                                break;
                            case "map_bump":
                                if (current_material)
                                    current_material.bump_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "bump":
                                if (current_material)
                                    current_material.bump_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "disp":
                                if (current_material)
                                    current_material.displacement_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "decal":
                                if (current_material)
                                    current_material.decal_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_pr":
                                if (current_material)
                                    current_material.roughness_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_pm":
                                if (current_material)
                                    current_material.metalic_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_ps":
                                if (current_material)
                                    current_material.sheen_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "map_ke":
                                if (current_material)
                                    current_material.emissive_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;
                            case "norm":
                                if (current_material)
                                    current_material.normal_texture = await Parser.parse_mtl_map(engine, current_material, [...parts], image_assets_path, image_assets);
                                break;

                    }
                }
                
                return material_list;
            }

            static async parse_mtl_map(engine:Engine, current_material:OBJ.MaterialData, parts:string[], image_assets_path:string, image_assets:Map<string, Texture>):Promise<TextureData> {
                var texture_name:string;
                var current_flag:string|null = null
                const texture_file = parts.pop();
                const map_type_string = parts.shift()
                var current_flag_arguments:string[] = [];
                if (texture_file) {
                    const texture_file_url = join_path(image_assets_path, texture_file);
                    
                    const res = await fetch(texture_file_url.trim());
                    if (res.ok) {
                        const blob = await res.blob();
                        if (map_type_string) {
                            texture_name = current_material.name + "_" + map_type_string;
                            image_assets.set(texture_name, new Texture(engine.graphics_manager, texture_name, await createImageBitmap(blob, { imageOrientation: 'flipY' }), TextureType.COLOR, {}));
                        } else {
                            throw Error(`A parsing error has occured that should not be possible while parsing a .mtl file map.`)
                        }
                    } else {
                        throw new Error(`The .obj image asset file at "${texture_file_url}" does not exist.`);
                    }
                } else {
                    throw new Error(`Failed to get get texture map file name for material named "${current_material.name}" when parsign .mtl file associated with .obj file.`)
                }

                const texture_data:TextureData = {name:texture_name};

                const set_flag = () => {
                    switch (current_flag) {
                        case "-blendu":
                            texture_data.horizontal_blend =
                                current_flag_arguments[0] === "off" ?
                                false : true;
                            break;
                        case "-blendv":
                            texture_data.vertical_blend =
                                current_flag_arguments[0] === "off" ?
                                false : true;
                            break;
                        case "-boost":
                            texture_data.mip_map_sharpness_boost = Number(current_flag_arguments[0]);
                            break;
                        case "-mm":
                            texture_data.additive_color_offset = Number(current_flag_arguments[0]);
                            texture_data.contrast_multiplier = Number(current_flag_arguments[1]);
                            break;
                        case "-o":
                            var u = Number(current_flag_arguments[0]);
                            var v = 0;
                            var w = 0;
                            if (current_flag_arguments.length >= 2)
                                v = Number(current_flag_arguments[1]);
                            if (current_flag_arguments.length >= 3)
                                w = Number(current_flag_arguments[2]);
                            texture_data.offset = new Vec3(u, v, w);
                            break;
                        case "-s":
                            var u = Number(current_flag_arguments[0]);
                            var v = 1;
                            var w = 1;
                            if (current_flag_arguments.length >= 2)
                                v = Number(current_flag_arguments[1]);
                            if (current_flag_arguments.length >= 3)
                                w = Number(current_flag_arguments[2]);
                            texture_data.scale = new Vec3(u, v, w);
                            break;
                        case "-t":
                            var u = Number(current_flag_arguments[0]);
                            var v = 0;
                            var w = 0;
                            if (current_flag_arguments.length >= 2)
                                v = Number(current_flag_arguments[1]);
                            if (current_flag_arguments.length >= 3)
                                w = Number(current_flag_arguments[2]);
                            texture_data.turbulence = new Vec3(u, v, w);
                            break;
                        case "-texres":
                            texture_data.generated_texture_resolution = Number(current_flag_arguments[0]);
                            break;
                        case "-clamp":
                            texture_data.clamp =
                                current_flag_arguments[0] === "on" ?
                                true : false;
                            break;
                        case "-bm":
                            texture_data.bump_multiplier = Number(current_flag_arguments[0]);
                            break;
                        case "-imfchan":
                            texture_data.bump_channel = current_flag_arguments[0] as BumpChannel;
                            break;
                        case "-type":
                            texture_data.reflection_map_type = current_flag_arguments[0] as ReflectionMapType;
                            break;
                    }
                    current_flag_arguments = []
                }

                for (const part of parts) {
                    switch (part) {
                        case "-blendu":
                        case "-blendv":
                        case "-boost":
                        case "-mm":
                        case "-o":
                        case "-s":
                        case "-t":
                        case "-texres":
                        case "-clamp":
                        case "-bm":
                        case "-imfchan":
                        case "-type":
                            set_flag();
                            current_flag = part;
                            break;
                    
                        default:
                            current_flag_arguments.push(part);
                            break;
                    }
                }
                set_flag();
                return texture_data;
            }

            static async parse_obj(engine:Engine, file_url:string, text: string, image_assets_path:string, image_assets:Map<string, Texture>): Promise<[OBJ.Object[], OBJ.MaterialData[]]> {
                const file_name = basename_path(file_url);
                const file_directory = dirname_path(file_url);
                const obj_name = file_name.split(".")[0];
                var object_list:OBJ.Object[] = [];
                var material_list:OBJ.MaterialData[] = [];
                var current_group:OBJ.Group|null = null;
                var current_object:OBJ.Object = Parser.create_object(obj_name);
                var current_data:OBJ.Data = Parser.create_data();

                const temp_vertices:[number, number, number][] = []
                const temp_normals:[number, number, number][] = []
                const temp_uvs:[number, number][] = []

                object_list.push(current_object);

                var collection_type:CollectionType = CollectionType.OBJECT;

                const insert_data = () => {
                    // Bake the data lists into arrays and delete temp
                    current_data.indices = new Uint16Array(current_data.temp!.indices_final);
                    current_data.vertices = new Float32Array(current_data.temp!.vertices_final);
                    current_data.uvs = new Float32Array(current_data.temp!.uvs_final);
                    current_data.normals = new Float32Array(current_data.temp!.normals_final);
                    current_data.dimensions = new Vec3(current_data.temp!.max_x - current_data.temp!.min_x, current_data.temp!.max_y - current_data.temp!.min_y, current_data.temp!.max_z - current_data.temp!.min_z);
                    current_data.center = new Vec3((current_data.temp!.max_x + current_data.temp!.min_x)/2.0, (current_data.temp!.max_y + current_data.temp!.min_y)/2.0, (current_data.temp!.max_z + current_data.temp!.min_z)/2.0);
                    
                    // set the data for the object
                    if (collection_type === CollectionType.OBJECT) {
                        current_object.data = current_data;
                    } else if (current_group) {
                        current_group.data = current_data;
                    }
                    current_data = Parser.create_data();
                }

                const get_object = (name:string) => {
                    for (const object of object_list)
                        if (object.name === name)
                            return object;
                    return null;
                }

                const get_group = (name:string) => {
                    for (const group of current_object.groups)
                        if (group.name === name)
                            return group;
                    return null;
                }
    
                const lines = text.split("\n");
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    switch (parts[0].toLowerCase()) {
                        case "mtllib":                            
                            material_list = material_list.concat(await Parser.load_mtl(engine, join_path(file_directory, parts[1]), image_assets_path, image_assets));                            
                            break;

                        case "usemtl":
                            if (collection_type === CollectionType.OBJECT) {
                                if (current_object.material !== undefined && current_object.material !== parts[1]) {
                                    insert_data();
                                    // Creates an adjacent subobject with the name objectName_materialName
                                    current_object = Parser.create_object(current_object.name.replace("_" + current_object.material, "") + "_" + parts[1]);
                                    current_object.material = parts[1];
                                    object_list.push(current_object);
                                    collection_type = CollectionType.OBJECT;
                                } else {
                                    current_object.material = parts[1];
                                }
                            } else if (current_group) {
                                if (current_group.material !== undefined && current_group.material !== parts[1]) {
                                    insert_data();
                                    // Creates an adjacent subobject with the name objectName_materialName
                                    current_group = Parser.create_group(current_group.name.replace("_" + current_group.material, "") + "_" + parts[1]);
                                    current_group.material = parts[1];
                                    current_object.groups.push(current_group);
                                    collection_type = CollectionType.GROUP;
                                } else {
                                    current_group.material = parts[1];
                                }
                            }
                            break;
                        
                        case "o":
                            // Object
                            insert_data();
                            const existing_object = get_object(parts[1])
                            if (existing_object) {
                                current_object = existing_object;
                            } else {
                                // add current_object to groups and create a new object
                                current_object = Parser.create_object(parts[1]);
                                object_list.push(current_object);
                                collection_type = CollectionType.OBJECT;
                            }
                            break;

                        case "g":
                            insert_data();
                            const existing_group = get_group(parts[1])
                            if (existing_group) {
                                current_group = existing_group;
                            } else {
                                // add current_object to groups and create a new object
                                current_group = Parser.create_group(parts[1]);
                                current_object.groups.push(current_group);
                                collection_type = CollectionType.GROUP;
                            }
                            break;
                    
                        case "v":
                            var [x, y, z] = parts.slice(1).map(Number);
                            temp_vertices.push([x, y, z]);
                            break;
                        case "vn":
                            var [x, y, z] = parts.slice(1).map(Number);
                            temp_normals.push([x, y, z]);
                            break;
                        case "vt":
                            var [u, v] = parts.slice(1).map(Number);
                            temp_uvs.push([u, v]);
                            break;
                        case "f":
                            // Each face can be triangles or quads
                            const face_verts = parts.slice(1);
                            const face_indices: number[] = [];

                            for (const fv of face_verts) {
                                if (!current_data.temp!.vertex_map.has(fv)) {
                                    const [vIdx, vtIdx, vnIdx] = fv.split("/").map(s => parseInt(s));
                                    const [x, y, z] = temp_vertices[vIdx - 1];
                                    
                                    // FIND MINS AND MAXES
                                    current_data.temp!.min_x = x < current_data.temp!.min_x ? x : current_data.temp!.min_x;
                                    current_data.temp!.min_y = y < current_data.temp!.min_y ? y : current_data.temp!.min_y;
                                    current_data.temp!.min_z = z < current_data.temp!.min_z ? z : current_data.temp!.min_z;

                                    current_data.temp!.max_x = x > current_data.temp!.max_x ? x : current_data.temp!.max_x;
                                    current_data.temp!.max_y = y > current_data.temp!.max_y ? y : current_data.temp!.max_y;
                                    current_data.temp!.max_z = z > current_data.temp!.max_z ? z : current_data.temp!.max_z;
                                    // FIND VERTEX

                                    current_data.temp!.vertices_final.push(x, y, z);
                                    if (vtIdx && temp_uvs[vtIdx - 1])
                                        current_data.temp!.uvs_final.push(...temp_uvs[vtIdx - 1]);
                                    else
                                        current_data.temp!.uvs_final.push(0, 0);
                                    if (vnIdx && temp_normals[vnIdx - 1])
                                        current_data.temp!.normals_final.push(...temp_normals[vnIdx - 1]);
                                    else
                                        current_data.temp!.normals_final.push(0, 0, 0);
                                    const index = (current_data.temp!.vertices_final.length / 3) - 1;
                                    current_data.temp!.vertex_map.set(fv, index);
                                    face_indices.push(index);
                                } else {
                                    face_indices.push(current_data.temp!.vertex_map.get(fv)!);
                                }
                            }

                            // Triangulate quads if necessary
                            if (face_indices.length === 3) {
                                current_data.temp!.indices_final.push(...face_indices);
                            } else if (face_indices.length === 4) {
                                current_data.temp!.indices_final.push(face_indices[0], face_indices[1], face_indices[2]);
                                current_data.temp!.indices_final.push(face_indices[0], face_indices[2], face_indices[3]);
                            }
                            break;
                    }
                }
                insert_data();
                return [object_list, material_list];
            }
        }

    }
}

async function parse_obj(text: string): Promise<AssetFile.OBJ.Data> {
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
            image_assets.push(new Texture(gm, image_asset_path, await createImageBitmap(blob, { imageOrientation: 'flipY' }), TextureType.COLOR, {}));
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
    var model = new Model(gm, "default", mesh, material);

    return model;
}