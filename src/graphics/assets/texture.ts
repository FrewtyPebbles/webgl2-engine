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

    internal_format:number;
    format:number;
    image_type:number = 0;
    width:number;
    height:number;
    image_array_size:number;
    mip_level:number;
    texture_parameters:{[parameter_name:number]:number};

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
        var width = 0, height = 0, mip_level = 0;
        var image_array_size = 1;
        var texture_parameters:{[parameter_name:number]:number} = {};
        this.format = this.gm.gl.DEPTH_COMPONENT; // Random default, this will be set down the call tree
        this.internal_format = this.gm.gl.DEPTH_COMPONENT24; // Random default, this will be set down the call tree

        if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'string' && Object.values(TextureType).includes(arg3 as TextureType)) {
            // Blank Texture Constructor
            width = arg1 as number;
            height = arg2 as number;
            this.texture_type = arg3 ? arg3 as TextureType : TextureType.COLOR;
            texture_parameters = arg4 ? arg4 as {[parameter_name:number]:number} : {};

            this.webgl_texture = this.create_texture(null, this.texture_type, texture_parameters, 0, width, height);
        } else if (typeof arg1 === 'number') {
            // Texture Array Constructor count
            if (arg4 !== TextureType.COLOR_ARRAY
            && arg4 !== TextureType.DEPTH_ARRAY
            && typeof arg1 === "number") {
                throw new Error(`Arg 2 "texture_type" must be TextureType.COLOR_ARRAY or TextureType.DEPTH_ARRAY if the "images" argument is an number of images.`)
            }

            image_array_size = arg1 as number;
            width = arg2 as number;
            height = arg3 as number;
            this.texture_type = arg4 as TextureType;
            texture_parameters = arg5 === undefined ? {} : arg5 as {[parameter_name:number]:number};
            mip_level = arg6 === undefined ? 0 : arg6 as number;
            this.webgl_texture = this.create_texture(image_array_size, this.texture_type, texture_parameters, mip_level, width, height);

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
            texture_parameters = arg3 === undefined ? {} : arg3 as {[parameter_name:number]:number};
            mip_level = arg4 === undefined ? 0 : arg4 as number;
            this.webgl_texture = this.create_texture(images, this.texture_type, texture_parameters, mip_level);
        } else {
            // Texture Constructor
            if (arg1 instanceof Array) {
                throw new Error(`Arg 2 "texture_type" must be TextureType.COLOR_ARRAY if the "images" argument is an array.`)
            }

            const image = arg1 as TexImageSource;
            this.texture_type = arg2 as TextureType;
            texture_parameters = arg3 === undefined ? {} : arg3 as {[parameter_name:number]:number};
            mip_level = arg4 === undefined ? 0 : arg3 as number;
            this.webgl_texture = this.create_texture(image, this.texture_type, texture_parameters, mip_level);
        }
        
        // set parameters

        this.width = width;
        this.height = height;
        this.texture_parameters = texture_parameters;
        this.mip_level = mip_level;
        this.image_array_size = image_array_size;
    }

    resize_texture_array(new_size:number) {        
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, this.webgl_texture);
        this.gm.gl.texImage3D(
            this.gm.gl.TEXTURE_2D_ARRAY,
            0,
            this.internal_format,
            this.width,
            this.height,
            new_size,
            0,
            this.format,
            this.image_type,
            null
        );
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, null);
    }

    [Symbol.dispose](): void {
        this.gm.gl.deleteTexture(this.webgl_texture);
    }

    private create_texture(image:TexImageSource[]|TexImageSource|number|null, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, width:number = 0, height:number = 0):WebGLTexture {
        switch (texture_type) {
            case TextureType.COLOR:
               return this.create_color_texture(image as TexImageSource, width, height, mip_level, texture_parameters);
            case TextureType.DEPTH:
                return this.create_depth_texture(image as TexImageSource, width, height, texture_parameters);
            case TextureType.COLOR_ARRAY:
                return this.create_color_array_texture(image as TexImageSource[]|number, width, height, mip_level, texture_parameters);
            case TextureType.DEPTH_ARRAY:
                return this.create_depth_array_texture(Math.max(image as number, 1), width, height, texture_parameters);

        }
    }

    private create_depth_array_texture(images:number, width:number = 0, height:number = 0, texture_parameters:{[parameter_name:number]:number}) {
        // images is a count of images.        
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, texture);
        this.internal_format = this.gm.gl.DEPTH_COMPONENT24;
        this.format = this.gm.gl.DEPTH_COMPONENT;
        this.image_type = this.gm.gl.UNSIGNED_INT;
        this.gm.gl.texImage3D(
            this.gm.gl.TEXTURE_2D_ARRAY,
            0,
            this.internal_format,
            width,
            height,
            images,
            0,
            this.format,
            this.image_type,
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

    private create_color_array_texture(images:TexImageSource[]|number, width:number = 0, height:number = 0, mip_level:number, texture_parameters:{[parameter_name:number]:number}) {
        // images is either a list of images or a count of images to allocate for.
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D_ARRAY, texture);
        this.internal_format = this.gm.gl.RGBA;
        this.format = this.gm.gl.RGBA;
        this.image_type = this.gm.gl.UNSIGNED_BYTE;
        if (images instanceof Array) {
            this.gm.gl.texImage3D(
                this.gm.gl.TEXTURE_2D_ARRAY,
                mip_level,
                this.internal_format,
                width,
                height,
                images.length,
                0,
                this.format,
                this.image_type,
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
                    this.format,
                    this.image_type,
                    image
                );
            }
            console.log("CAT", width, height, images);
        } else {
            this.gm.gl.texImage3D(
                this.gm.gl.TEXTURE_2D_ARRAY,
                mip_level,
                this.internal_format,
                width,
                height,
                Math.max(images, 1),
                0,
                this.format,
                this.image_type,
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
    
    private create_color_texture(image:TexImageSource|null, width:number = 0, height:number = 0, mip_level:number, texture_parameters:{[parameter_name:number]:number}) {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        this.internal_format = this.gm.gl.RGBA;
        this.format = this.gm.gl.RGBA;
        this.image_type = this.gm.gl.UNSIGNED_BYTE;
        if (image === null)
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                mip_level,
                this.internal_format,
                width,
                height,
                0,
                this.format,
                this.image_type,
                null
            );
        else
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                mip_level,
                this.internal_format,
                this.format,
                this.image_type,
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

    private create_depth_texture(image:TexImageSource|null, width:number = 0, height:number = 0, texture_parameters:{[parameter_name:number]:number}) {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        this.internal_format = this.gm.gl.DEPTH_COMPONENT24;
        this.format = this.gm.gl.DEPTH_COMPONENT;
        this.image_type = this.gm.gl.UNSIGNED_INT;
        if (image === null)
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                0,
                this.internal_format,
                width,
                height,
                0,
                this.format,
                this.image_type,
                null
            );
        else
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_2D,
                0,
                this.internal_format,
                this.format,
                this.image_type,
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
    name:string;
    webgl_texture: WebGLTexture;
    size:number;

    constructor(gm:GraphicsManager,
        name:string,
        size:number,
        texture_type:TextureType
    );

    constructor(gm:GraphicsManager,
        name:string,
        size:number,
        texture_type:TextureType,
        mip_level:number,
    );

    constructor(gm:GraphicsManager,
        name:string,
        size:number,
        texture_type:TextureType,
        mip_level:number,
        image_type:number,
    );

    constructor(gm:GraphicsManager,
        name:string,
        size:number,
        texture_type:TextureType,
        mip_level:number,
        image_type:number,
        texture_parameters:{[parameter_name:number]:number}
    );

    constructor(gm:GraphicsManager,
        name:string,
        size:number,
        texture_type:TextureType,
        image_top:TexImageSource|Float32Array,
        image_bottom:TexImageSource|Float32Array,
        image_front:TexImageSource|Float32Array,
        image_back:TexImageSource|Float32Array,
        image_left:TexImageSource|Float32Array,
        image_right:TexImageSource|Float32Array,
        texture_parameters:{[parameter_name:number]:number},
        mip_level:number,
    );

    constructor(gm:GraphicsManager,
        name:string,
        size:number,
        texture_type:TextureType,
        image_top:TexImageSource|Float32Array,
        image_bottom:TexImageSource|Float32Array,
        image_front:TexImageSource|Float32Array,
        image_back:TexImageSource|Float32Array,
        image_left:TexImageSource|Float32Array,
        image_right:TexImageSource|Float32Array,
        texture_parameters:{[parameter_name:number]:number},
        mip_level:number,
        image_type:number
    );

    constructor(gm:GraphicsManager,
        name:string,
        texture_type:TextureType,
        image_top:TexImageSource|Float32Array,
        image_bottom:TexImageSource|Float32Array,
        image_front:TexImageSource|Float32Array,
        image_back:TexImageSource|Float32Array,
        image_left:TexImageSource|Float32Array,
        image_right:TexImageSource|Float32Array,
        texture_parameters:{[parameter_name:number]:number},
        mip_level:number,
    );

    constructor(gm:GraphicsManager,
        name:string,
        texture_type:TextureType,
        image_top:TexImageSource|Float32Array,
        image_bottom:TexImageSource|Float32Array,
        image_front:TexImageSource|Float32Array,
        image_back:TexImageSource|Float32Array,
        image_left:TexImageSource|Float32Array,
        image_right:TexImageSource|Float32Array,
        texture_parameters:{[parameter_name:number]:number},
        mip_level:number,
        image_type:number
    );

    constructor(gm:GraphicsManager, name:string, arg1:any, arg2:any, arg3:any = 0, arg4:any = UNSIGNED_INT, arg5:any = {}, arg6?:any|undefined, arg7?:any|undefined, arg8?:any|undefined, arg9?:any|undefined, arg10?:any|undefined, arg11?:any|undefined) {
        this.gm = gm;
        this.name = name;
        
        if (arg6 === undefined) {
            const size:number = arg1;
            this.size = size;
            const texture_type:TextureType = arg2;
            const mip_level:number = arg3;
            const image_type:number = arg4;
            const texture_parameters:{[parameter_name:number]:number} = arg5;
            this.webgl_texture = this.create_depth_texture(size, texture_type, texture_parameters, mip_level, image_type);
        } else {
            var size:number = 0;
            var texture_type:TextureType;
            var image_top:TexImageSource;
            var image_bottom:TexImageSource;
            var image_front:TexImageSource;
            var image_back:TexImageSource;
            var image_left:TexImageSource;
            var image_right:TexImageSource;
            var texture_parameters:{[parameter_name:number]:number};
            var mip_level:number;
            var image_type:number;
            if (typeof arg1 === "number") {
                size = arg1;
                texture_type = arg2;
                image_top = arg3;
                image_bottom = arg4;
                image_front = arg5;
                image_back = arg6;
                image_left = arg7;
                image_right = arg8;
                texture_parameters = arg9;
                mip_level = arg10;
                image_type = arg11;
            } else {
                texture_type = arg1;
                image_top = arg2;
                image_bottom = arg3;
                image_front = arg4;
                image_back = arg5;
                image_left = arg6;
                image_right = arg7;
                texture_parameters = arg8;
                mip_level = arg9;
                image_type = arg10 ? arg10 : UNSIGNED_BYTE;
            }

            this.size = size;
            
            this.webgl_texture = this.create_texture(size, [
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
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_COMPARE_MODE, this.gm.gl.COMPARE_REF_TO_TEXTURE);
        this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, this.gm.gl.TEXTURE_COMPARE_FUNC, this.gm.gl.LEQUAL);

        for (let [parameter_name_string, parameter_value] of Object.entries(texture_parameters)) {
            let parameter_name = Number(parameter_name_string);
            this.gm.gl.texParameteri(this.gm.gl.TEXTURE_CUBE_MAP, parameter_name, parameter_value);
        }

        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_CUBE_MAP, null);

        return texture;
    }

    private create_texture(size:number, images:(TexImageSource|Float32Array)[], texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE):WebGLTexture {
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
            if (images[i] instanceof Float32Array)
                this.gm.gl.texImage2D(target, mip_level, this.gm.gl.RGBA32F, size, size, 0, this.gm.gl.RGBA, image_type, images[i]);
            else
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
        
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_CUBE_MAP, null);

        return texture;
    }
}