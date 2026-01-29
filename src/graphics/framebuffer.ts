import { Vec4 } from "@vicimpa/glm";
import { GraphicsManager } from "./graphics_manager.ts";
import { CubeMapTexture, Texture, TextureType } from "./assets/texture.ts";

export enum AttachmentType {
    TEXTURE_COLOR,
    TEXTURE_DEPTH,
    TEXTURE_STENCIL,
    TEXTURE_DEPTH_STENCIL,
    CUBEMAP_TEXTURE_COLOR,
    CUBEMAP_TEXTURE_DEPTH,
    CUBEMAP_TEXTURE_STENCIL,
    CUBEMAP_TEXTURE_DEPTH_STENCIL,
}

export interface AttachmentInfo {
    name:string;
    type:AttachmentType;
    mipmap_level?:number;
    texture_parameters?:{[key:number]:number};
    buffer_source?:boolean;
}

export class Framebuffer {
    name:string;
    gl:WebGL2RenderingContext;
    gm:GraphicsManager;
    width:number;
    height:number;
    clear_color:Vec4;
    webgl_frame_buffer:WebGLFramebuffer;
    use_depth_buffer:boolean = false;
    textures:{[name:string]:Texture|CubeMapTexture} = {};
    color_attachment_count:number = 0;
    read_source_color_attachment:number = 0

    constructor(name:string, gm:GraphicsManager, gl:WebGL2RenderingContext, width:number, height:number, attachment_infos:AttachmentInfo[], clear_color:Vec4 = new Vec4(0,0,0,1), read_from_back_buffer:boolean = false) {
        this.name = name
        this.gl = gl;
        this.gm = gm;
        this.name = name;
        this.width = width;
        this.height = height;
        this.clear_color = clear_color;
        this.webgl_frame_buffer = this.gl.createFramebuffer();

        let attachment_numbers:number[] = []

        this.gl.bindFramebuffer(gl.FRAMEBUFFER, this.webgl_frame_buffer);

        for (const attachment of attachment_infos) {
            this.create_attachment(attachment, attachment_numbers);
        }
        this.gl.drawBuffers(attachment_numbers.length ? attachment_numbers : [gl.NONE]);
        if (read_from_back_buffer)
            this.gl.readBuffer(this.gl.BACK);
        else if (this.read_source_color_attachment === this.gl.NONE)
            this.gl.readBuffer(this.gl.NONE);
        else
            this.gl.readBuffer(this.read_source_color_attachment);
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw Error(`Framebuffer incomplete, STATUS = ${gl.checkFramebufferStatus(gl.FRAMEBUFFER)}`);
        }

        this.gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    private create_attachment(attachment:AttachmentInfo, attachment_numbers:number[]) {
        const is_depth_textures_attachment = attachment.type === AttachmentType.TEXTURE_DEPTH || 
            attachment.type === AttachmentType.TEXTURE_DEPTH_STENCIL;
        switch (attachment.type) {
            case AttachmentType.TEXTURE_DEPTH_STENCIL:
            case AttachmentType.TEXTURE_DEPTH:
                this.create_attachment_depth_texture(attachment);
                break;
        
            case AttachmentType.TEXTURE_COLOR:
                this.create_attachment_color_texture(attachment, attachment_numbers);
                break;

            case AttachmentType.CUBEMAP_TEXTURE_DEPTH:
                this.create_attachment_depth_cubemap_texture(attachment);
                break;

            default:
                throw new Error(`AttachmentType.${attachment.type} is not yet supported.`)
                break;
        }
    }

    private create_attachment_color_texture(attachment:AttachmentInfo, attachment_numbers:number[]) {
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.LINEAR;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.LINEAR;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        const attachment_num = this.gl.COLOR_ATTACHMENT0 + this.color_attachment_count;

        this.textures[attachment.name] = new Texture(
            this.gm,
            this.width,
            this.height,
            TextureType.COLOR,
            tex_parameters
        );
        
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            attachment_num,
            this.gl.TEXTURE_2D,
            this.textures[attachment.name].webgl_texture,
            attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
        );

        if (attachment.buffer_source)
            this.read_source_color_attachment = attachment_num;

        attachment_numbers.push(attachment_num);
        this.color_attachment_count++;
    }

    private create_attachment_depth_texture(attachment:AttachmentInfo) {
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        this.use_depth_buffer = true;

        this.textures[attachment.name] = new Texture(
            this.gm,
            this.width,
            this.height,
            TextureType.DEPTH,
            tex_parameters
        );

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.DEPTH_ATTACHMENT,
            this.gl.TEXTURE_2D,
            this.textures[attachment.name].webgl_texture,
            attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
        );
    }

    private create_attachment_depth_cubemap_texture(attachment:AttachmentInfo) {
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        this.use_depth_buffer = true;

        this.textures[attachment.name] = new CubeMapTexture(
            this.gm,
            this.width,
            TextureType.DEPTH,
            0,
            this.gl.UNSIGNED_INT,
            tex_parameters
        );

        const faces = [
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];
        faces.forEach((face) => {
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER,
                this.gl.DEPTH_ATTACHMENT,
                face,
                this.textures[attachment.name].webgl_texture,
                attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
            );
        });
    }

    use() {
        this.gm.use_framebuffer(this.name);
    }
}
