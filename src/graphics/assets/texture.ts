import { GraphicsManager } from "../graphics_manager.ts";

const UNSIGNED_BYTE = 5121;

const UNSIGNED_INT = 5125;

export enum TextureType {
    COLOR = "COLOR",
    DEPTH = "DEPTH",
    COLOR_ARRAY = "COLOR_ARRAY",
    DEPTH_ARRAY = "DEPTH_ARRAY",
}

export class Texture implements Disposable {
    gm:GraphicsManager;
    name:string;
    webgl_texture: WebGLTexture;
    texture_type:TextureType = TextureType.COLOR;

    // Blank Texture Constructor
    constructor(gm:GraphicsManager, name:string, width:number, height:number, texture_type:TextureType);
    constructor(gm:GraphicsManager, name:string, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number});
    constructor(gm:GraphicsManager, name:string, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, image_type:number);
    
    // Texture Array Constructor count
    constructor(gm:GraphicsManager, name:string, images:number, width:number, height:number, texture_type:TextureType);
    constructor(gm:GraphicsManager, name:string, images:number, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number});
    constructor(gm:GraphicsManager, name:string, images:number, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number);
    constructor(gm:GraphicsManager, name:string, images:number, width:number, height:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number);
    
    // Texture Array Constructor Images
    constructor(gm:GraphicsManager, name:string, images:TexImageSource[]|number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number});
    constructor(gm:GraphicsManager, name:string, images:TexImageSource[]|number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number);
    constructor(gm:GraphicsManager, name:string, images:TexImageSource[]|number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number);
    
    // Texture Constructor
    constructor(gm:GraphicsManager, name:string, image:TexImageSource, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number});
    constructor(gm:GraphicsManager, name:string, image:TexImageSource, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number);
    constructor(gm:GraphicsManager, name:string, image:TexImageSource, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number);
    
    constructor(gm:GraphicsManager, name:string, arg1:any, arg2:any, arg3?:any|undefined, arg4?:any|undefined, arg5?:any|undefined, arg6?:any|undefined, arg7?:any|undefined) {
        this.gm = gm;
        this.name = name;

        if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'string' && Object.values(TextureType).includes(arg3 as TextureType)) {
            // Blank Texture Constructor
            const width = arg1 as number;
            const height = arg2 as number;
            this.texture_type = arg3 ? arg3 as TextureType : TextureType.COLOR;
            const texture_parameters = arg4 ? arg4 as {[parameter_name:number]:number} : {};
            let fallback_image_type:number = this.gm.gl.UNSIGNED_BYTE;
            switch (this.texture_type) {
                case TextureType.COLOR:
                    fallback_image_type = this.gm.gl.UNSIGNED_BYTE;
                    break;
                case TextureType.DEPTH:
                    fallback_image_type = this.gm.gl.UNSIGNED_INT;
                    break;
            }
            const image_type = arg5 ? arg5 as number : fallback_image_type;

            this.webgl_texture = this.create_texture(null, this.texture_type, texture_parameters, 0, image_type, width, height);
        } else if (typeof arg1 === 'number') {
            // Texture Array Constructor count
            if (arg4 !== TextureType.COLOR_ARRAY
            && arg4 !== TextureType.DEPTH_ARRAY
            && typeof arg1 === "number") {
                throw new Error(`Arg 2 "texture_type" must be TextureType.COLOR_ARRAY or TextureType.DEPTH_ARRAY if the "images" argument is an number of images.`)
            }

            const images = arg1 as number;
            const width = arg2 as number;
            const height = arg3 as number;
            this.texture_type = arg4 as TextureType;
            const texture_parameters = arg5 === undefined ? {} : arg5 as {[parameter_name:number]:number};
            const mip_level = arg6 === undefined ? 0 : arg6 as number;
            const image_type = arg7 === undefined ? this.gm.gl.UNSIGNED_BYTE : arg7 as number;
            this.webgl_texture = this.create_texture(images, this.texture_type, texture_parameters, mip_level, image_type, width, height);

        } else if (arg1 instanceof Array) {
            // Texture Array Constructor Images
            if (arg2 !== TextureType.COLOR_ARRAY && arg1 instanceof Array) {
                throw new Error(`Arg 2 "texture_type" must be TextureType.COLOR_ARRAY if the "images" argument is an array.`)
            }

            if (arg2 !== TextureType.COLOR_ARRAY
            && arg2 !== TextureType.DEPTH_ARRAY
            && typeof arg1 === "number") {
                throw new Error(`Arg 2 "texture_type" must be TextureType.COLOR_ARRAY or TextureType.DEPTH_ARRAY if the "images" argument is an number of images.`)
            }
            
            const images = arg1 as TexImageSource[];
            this.texture_type = arg2 as TextureType;
            const texture_parameters = arg3 === undefined ? {} : arg3 as {[parameter_name:number]:number};
            const mip_level = arg4 === undefined ? 0 : arg4 as number;
            const image_type = arg5 === undefined ? this.gm.gl.UNSIGNED_BYTE : arg5 as number;
            this.webgl_texture = this.create_texture(images, this.texture_type, texture_parameters, mip_level, image_type);
        } else {
            // Texture Constructor
            if (arg1 instanceof Array) {
                throw new Error(`Arg 2 "texture_type" must be TextureType.COLOR_ARRAY if the "images" argument is an array.`)
            }

            const image = arg1 as TexImageSource;
            this.texture_type = arg2 as TextureType;
            const texture_parameters = arg3 === undefined ? {} : arg3 as {[parameter_name:number]:number};
            const mip_level = arg4 === undefined ? 0 : arg3 as number;
            const image_type = arg5 === undefined ? this.gm.gl.UNSIGNED_BYTE : arg5 as number;
            this.webgl_texture = this.create_texture(image, this.texture_type, texture_parameters, mip_level, image_type);
        }
    }

    [Symbol.dispose](): void {
        this.gm.gl.deleteTexture(this.webgl_texture);
    }

    private create_texture(image:TexImageSource[]|TexImageSource|number|null, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE, width:number = 0, height:number = 0):WebGLTexture {
        switch (texture_type) {
            case TextureType.COLOR:
               return this.create_color_texture(image as TexImageSource, width, height, image_type, mip_level, texture_parameters);
            case TextureType.DEPTH:
                return this.create_depth_texture(image as TexImageSource, width, height, image_type, texture_parameters);
            case TextureType.COLOR_ARRAY:
                return this.create_color_array_texture(image as TexImageSource[]|number, width, height, image_type, mip_level, texture_parameters);
            case TextureType.DEPTH_ARRAY:
                return this.create_depth_array_texture(Math.max(image as number, 1), width, height, texture_parameters);

        }
    }

    private create_depth_array_texture(images:number, width:number = 0, height:number = 0, texture_parameters:{[parameter_name:number]:number}) {
        // images is a count of images.
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, texture);
        const internal_format = this.gm.gl.DEPTH_COMPONENT24;
        const format = this.gm.gl.DEPTH_COMPONENT;
        const image_type = this.gm.gl.UNSIGNED_INT;
        this.gm.gl.texImage3D(
            this.gm.gl.TEXTURE_2D_ARRAY,
            0,
            internal_format,
            width,
            height,
            images,
            0,
            format,
            image_type,
            null
        );

        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, this.gm.gl.TEXTURE_MIN_FILTER,     this.gm.gl.NEAREST);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, this.gm.gl.TEXTURE_MAG_FILTER,     this.gm.gl.NEAREST);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, this.gm.gl.TEXTURE_WRAP_S,         this.gm.gl.CLAMP_TO_EDGE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, this.gm.gl.TEXTURE_WRAP_T,         this.gm.gl.CLAMP_TO_EDGE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, this.gm.gl.TEXTURE_BASE_LEVEL,     0);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, this.gm.gl.TEXTURE_MAX_LEVEL,      0);
        
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, parameter_name, parameter_value);
        }
        
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, null);

        return texture;
    }

    private create_color_array_texture(images:TexImageSource[]|number, width:number = 0, height:number = 0, image_type:number = this.gm.gl.UNSIGNED_BYTE, mip_level:number, texture_parameters:{[parameter_name:number]:number}) {
        // images is either a list of images or a count of images to allocate for.
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, texture);
        const internal_format = this.gm.gl.RGBA;
        const format = this.gm.gl.RGBA;
        if (images instanceof Array) {
            this.gm.gl.texImage3D(
                this.gm.gl.TEXTURE_2D_ARRAY,
                mip_level,
                internal_format,
                width,
                height,
                images.length,
                0,
                format,
                image_type,
                null
            );

            for (var i = 0; i < (images as TexImageSource[]).length; ++i) {
                const image = (images as TexImageSource[])[i];
                this.gm.gl.texSubImage3D(
                    this.gm.gl.TEXTURE_2D_ARRAY,
                    mip_level,
                    0, 0, i, // x, y, z offset
                    width,
                    height,
                    1, // z depth
                    format,
                    image_type,
                    image
                );
            }
        } else {
            this.gm.gl.texImage3D(
                this.gm.gl.TEXTURE_2D_ARRAY,
                mip_level,
                internal_format,
                width,
                height,
                Math.max(images, 1),
                0,
                format,
                image_type,
                null
            );
        }
        
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D_ARRAY, parameter_name, parameter_value);
        }

        if (images)
            this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_2D_ARRAY);
        
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, null);

        return texture;
    }
    
    private create_color_texture(image:TexImageSource|null, width:number = 0, height:number = 0, image_type:number = this.gm.gl.UNSIGNED_BYTE, mip_level:number, texture_parameters:{[parameter_name:number]:number}) {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        const internal_format = this.gm.gl.RGBA;
        const format = this.gm.gl.RGBA;
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

        
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D, parameter_name, parameter_value);
        }

        this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_2D);
            
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, null);

        return texture;
    }

    private create_depth_texture(image:TexImageSource|null, width:number = 0, height:number = 0, image_type:number = this.gm.gl.UNSIGNED_BYTE, texture_parameters:{[parameter_name:number]:number}) {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        const internal_format = this.gm.gl.DEPTH_COMPONENT24;
        const format = this.gm.gl.DEPTH_COMPONENT;
        if (image === null)
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                0,
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
                0,
                internal_format,
                format,
                image_type,
                image as TexImageSource
            );

        
        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_2D, parameter_name, parameter_value);
        }

        this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_2D);
            
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, null);

        return texture;
    }
}

export class CubeMapTexture implements Disposable {
    gm:GraphicsManager;
    webgl_texture: WebGLTexture;

    constructor(gm:GraphicsManager,
        size:number,
        texture_type:TextureType
    );

    constructor(gm:GraphicsManager,
        size:number,
        texture_type:TextureType,
        mip_level:number,
    );

    constructor(gm:GraphicsManager,
        size:number,
        texture_type:TextureType,
        mip_level:number,
        image_type:number,
    );

    constructor(gm:GraphicsManager,
        size:number,
        texture_type:TextureType,
        mip_level:number,
        image_type:number,
        texture_parameters:{[parameter_name:number]:number}
    );

    constructor(gm:GraphicsManager,
        texture_type:TextureType,
        image_top:TexImageSource,
        image_bottom:TexImageSource,
        image_front:TexImageSource,
        image_back:TexImageSource,
        image_left:TexImageSource,
        image_right:TexImageSource,
        texture_parameters:{[parameter_name:number]:number},
        mip_level:number,
    );

    constructor(gm:GraphicsManager,
        texture_type:TextureType,
        image_top:TexImageSource,
        image_bottom:TexImageSource,
        image_front:TexImageSource,
        image_back:TexImageSource,
        image_left:TexImageSource,
        image_right:TexImageSource,
        texture_parameters:{[parameter_name:number]:number},
        mip_level:number,
        image_type:number
    );

    constructor(gm:GraphicsManager, arg1:any, arg2:any, arg3:any = 0, arg4:any = UNSIGNED_INT, arg5:any = {}, arg6?:any|undefined, arg7?:any|undefined, arg8?:any|undefined, arg9?:any|undefined, arg10:any|undefined = UNSIGNED_BYTE) {
        this.gm = gm;
        
        if (arg6 === undefined) {
            const size:number = arg1;
            const texture_type:TextureType = arg2;
            const mip_level:number = arg3;
            const image_type:number = arg4;
            const texture_parameters:{[parameter_name:number]:number} = arg5;
            this.webgl_texture = this.create_depth_texture(size, texture_type, texture_parameters, mip_level, image_type);
        } else {

            const texture_type:TextureType = arg1;
            const image_top:TexImageSource = arg2;
            const image_bottom:TexImageSource = arg3;
            const image_front:TexImageSource = arg4;
            const image_back:TexImageSource = arg5;
            const image_left:TexImageSource = arg6;
            const image_right:TexImageSource = arg7;
            const texture_parameters:{[parameter_name:number]:number} = arg8;
            const mip_level:number = arg9;
            const image_type:number = arg10;

            this.webgl_texture = this.create_texture([
                image_right,
                image_left,
                image_top,
                image_bottom,
                image_front,
                image_back
            ], texture_parameters, mip_level, image_type);
        }
        
    }

    [Symbol.dispose](): void {
        this.gm.gl.deleteTexture(this.webgl_texture);
    }

    private create_depth_texture(size:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number) {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_CUBE_MAP, texture);

        for (let i = 0; i < 6; i++) {
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 
                mip_level, // mip level
                this.gm.gl.DEPTH_COMPONENT24, // internal format
                size, size, // width, height
                0, // border
                this.gm.gl.DEPTH_COMPONENT, // format
                image_type, // type
                null // no data yet
            );
        }

        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_MAG_FILTER, this.gm.gl.NEAREST);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_MIN_FILTER, this.gm.gl.NEAREST);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_WRAP_S, this.gm.gl.CLAMP_TO_EDGE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_WRAP_T, this.gm.gl.CLAMP_TO_EDGE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_WRAP_R, this.gm.gl.CLAMP_TO_EDGE);

        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, parameter_name, parameter_value);
        }

        return texture;
    }

    private create_texture(images:TexImageSource[], texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE):WebGLTexture {
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
            this.gm.gl.texImage2D(target, mip_level, this.gm.gl.RGBA, this.gm.gl.RGBA, image_type, images[i]);
        });
        
        this.gm.gl.generateMipmap(this.gm.gl.TEXTURE_CUBE_MAP);
        
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