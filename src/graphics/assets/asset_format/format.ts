

// This handles saving, loading, serializing and deserializing of assets
// It re-saves 3d assets as json to normalize all file formats
// It also resaves all image assets as .png

export interface Vec2JsonFormat {
    x:number;
    y:number;
}

export interface Vec3JsonFormat {
    x:number;
    y:number;
    z:number;
}

export interface Vec4JsonFormat {
    x:number;
    y:number;
    z:number;
    w:number;
}

export interface QuatJsonFormat {
    x:number;
    y:number;
    z:number;
    w:number;
}

enum NodeJsonType {
    NODE,
    NODE_2D,
    NODE_3D,
    SPRITE_2D,
    OBJECT_3D,
    CAMERA3D,
    POINT_LIGHT,
    SPOT_LIGHT,
    DIRECTIONAL_LIGHT,
    BONE3D,
    SKYBOX,
}

export type NodeIndex = number;
export type TextureIndex = number;
export type MaterialIndex = number;

export interface NodeJsonFormat {
    name:string;
    type:NodeJsonType;
    position:Vec3JsonFormat;// VEC3
    rotation:QuatJsonFormat;// QUATERNION
    scale:Vec3JsonFormat;
    children:NodeIndex[];
    
    // Superset of all possible node properties.
    material?:MaterialIndex;
    mesh?:MeshJsonFormat;
    fov?:number;
    near_plane?:number;
    far_plane?:number;
    color?:Vec3JsonFormat;
    ambient?:number;
    diffuse?:number;
    specular?:number;
    energy?:number;
    ambient_light?:Vec3JsonFormat;
}

export interface SceneJsonFormat {
    name:string;
    nodes:NodeIndex[]
};

export interface TextureJsonFormat {
    name: string;
    uri: string;
    texture_parameters:{[key:number]:number}
}

export interface MaterialJsonFormat {
    name:string;
    pbr: {
        // maps:
        albedo_map: TextureIndex;
        metalic_map: TextureIndex;
        roughness_map: TextureIndex;
        ao_map: TextureIndex;
        normal_map: TextureIndex;

        // Fallbacks:
        albedo: Vec4JsonFormat;
        metalic: number;
        roughness: number;
        ao: number;
    };
};

export interface MeshJsonFormat {
    name:string;
    vertices: Vec3JsonFormat[];
    normals: Vec3JsonFormat[];
    uvs: Vec2JsonFormat[];
    indices: number[];
    dimensions: Vec3JsonFormat;
    center: Vec3JsonFormat;
};

export enum InterpolationFunctionType {
    LINEAR,
    STEP,
    CUBICSPLINE,
}

export interface KeyframeJsonFormat {
    time:number;
    interpolation_function:InterpolationFunctionType;
    node:NodeIndex;
};

export interface AnimationJsonFormat {
    // WIP
    name:string;
    keyframes:KeyframeJsonFormat[];
}

export interface AssetJsonFormat {
    asset_name:string;
    version:string;
    materials:MaterialJsonFormat[];
    scenes:SceneJsonFormat[];
    textures:TextureJsonFormat[];
    meshes:MeshJsonFormat[];
    nodes:NodeJsonFormat[];
};