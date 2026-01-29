import { GraphicsManager } from "../graphics_manager.ts";

const UNSIGNED_BYTE = 5121;

const UNSIGNED_INT = 5125;

export enum TextureType {
    COLOR,
    DEPTH,
    ARRAY
}

// TODO : ADD TEXTURE ARRAY TYPE

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
            const texture_type = arg3 ? arg3 as TextureType : TextureType.COLOR;
            const texture_parameters = arg4 ? arg4 as {[parameter_name:number]:number} : {};
            let fallback_image_type:number = this.gm.gl.UNSIGNED_BYTE;
            switch (texture_type) {
                case TextureType.COLOR:
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

    private create_texture(image:TexImageSource|null, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number = this.gm.gl.UNSIGNED_BYTE, width:number = 0, height:number = 0):WebGLTexture {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_2D, texture);
        var internal_format = 0;
        var format = 0;
        var do_generate_mipmap = false;
        switch (texture_type) {
            case TextureType.COLOR:
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

    private create_depth_texture(size:number, texture_type:TextureType, texture_parameters:{[parameter_name:number]:number}, mip_level:number, image_type:number) {
        let texture = this.gm.gl.createTexture();
        if (!texture) throw new Error("Failed to create texture");
        this.gm.gl.bindTexture(this.gm.gl.TEXTURE_CUBE_MAP, texture);

        for (let i = 0; i < 6; i++) {
            this.gm.gl.texImage2D(
                this.gm.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 
                mip_level,                     // mip level
                this.gm.gl.DEPTH_COMPONENT24,  // internal format (sized for precision)
                size, size,            // width, height
                0,                     // border
                this.gm.gl.DEPTH_COMPONENT,    // format
                image_type,       // type
                null                   // no data yet
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