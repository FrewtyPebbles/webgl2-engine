import { Vec4 } from "@vicimpa/glm";
import { GraphicsManager } from "./graphics_manager.ts";
import { CubeMapTexture, Texture, TextureType } from "./assets/texture.ts";

export enum AttachmentType {
    TEXTURE_COLOR = "TEXTURE_COLOR",
    TEXTURE_DEPTH = "TEXTURE_DEPTH",
    TEXTURE_STENCIL = "TEXTURE_STENCIL",
    TEXTURE_DEPTH_STENCIL = "TEXTURE_DEPTH_STENCIL",
    TEXTURE_ARRAY_COLOR = "TEXTURE_ARRAY_COLOR",
    TEXTURE_ARRAY_DEPTH = "TEXTURE_ARRAY_DEPTH",
    TEXTURE_ARRAY_STENCIL = "TEXTURE_ARRAY_STENCIL",
    TEXTURE_ARRAY_DEPTH_STENCIL = "TEXTURE_ARRAY_DEPTH_STENCIL",
    CUBEMAP_TEXTURE_COLOR = "CUBEMAP_TEXTURE_COLOR",
    CUBEMAP_TEXTURE_DEPTH = "CUBEMAP_TEXTURE_DEPTH",
    CUBEMAP_TEXTURE_STENCIL = "CUBEMAP_TEXTURE_STENCIL",
    CUBEMAP_TEXTURE_DEPTH_STENCIL = "CUBEMAP_TEXTURE_DEPTH_STENCIL",
}

export interface AttachmentInfo {
    name:string;
    type:AttachmentType;
    texture:Texture|CubeMapTexture;
    texture_array_index?:number;
    mipmap_level?:number;
    texture_parameters?:{[key:number]:number};
    buffer_source?:boolean;
    color_attachment_number?:number;
}

// These determine what to enable or disable when binding the framebuffer.
export enum DrawFlag {
    DEPTH_TEST = 0,
    CULL_FRONT = 1 << 0,
    CULL_BACK = 1 << 1,
    CULL_FRONT_AND_BACK = 1 << 2,
    DEPTH_FUNC_NEVER = 1 << 3,
    DEPTH_FUNC_LESS = 1 << 4,
    DEPTH_FUNC_EQUAL = 1 << 5,
    DEPTH_FUNC_LESS_EQUAL = 1 << 6,
    DEPTH_FUNC_GREATER = 1 << 7,
    DEPTH_FUNC_NOT_EQUAL = 1 << 8,
    DEPTH_FUNC_GREATER_EQUAL = 1 << 9,
    DEPTH_FUNC_ALWAYS = 1 << 10,
    FORCE_WRITE_DEPTH = 1 << 11,
}

export type DrawBitFlags = number;

export function has_flag(bit_flag:DrawBitFlags, flag:DrawFlag):boolean {
    return (bit_flag & flag) === flag;
}

export class Framebuffer implements Disposable {
    name:string;
    gl:WebGL2RenderingContext;
    gm:GraphicsManager;
    clear_color:Vec4;
    width:number = 0;
    height:number = 0;
    webgl_frame_buffer:WebGLFramebuffer;
    attachment_info_map:{[key:string]:AttachmentInfo} = {};
    use_depth_buffer:boolean = false;
    use_color_buffer:boolean = false;
    color_attachment_count:number = 0;
    read_source_color_attachment:number = 0
    draw_flags:DrawBitFlags = 0;

    constructor(name:string, gm:GraphicsManager, gl:WebGL2RenderingContext, attachment_infos:AttachmentInfo[], draw_flags:DrawBitFlags, clear_color:Vec4 = new Vec4(0,0,0,1), read_from_back_buffer:boolean = false) {
        this.name = name
        this.gl = gl;
        this.gm = gm;
        this.name = name;
        this.clear_color = clear_color;
        this.webgl_frame_buffer = this.gl.createFramebuffer();
        this.draw_flags = draw_flags;
        

        let attachment_numbers:number[] = []

        this.gl.bindFramebuffer(gl.FRAMEBUFFER, this.webgl_frame_buffer);

        for (const attachment of attachment_infos) {
            this.create_attachment(attachment, attachment_numbers);
            this.attachment_info_map[attachment.name] = attachment;
            if (attachment.texture instanceof Texture) {
                this.width = attachment.texture.width;
                this.height = attachment.texture.height;
            } else if (attachment.texture instanceof CubeMapTexture) {
                this.width = this.height = attachment.texture.size;
            }
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

    [Symbol.dispose](): void {
        this.gl.deleteFramebuffer(this.webgl_frame_buffer);
    }

    set_attachment_texture_index(attachment_name:string, index:number) {        
        const not_bound = this.gm.framebuffer !== this;
        if (not_bound)
            this.use();
        const attachment = this.attachment_info_map[attachment_name];
        switch (attachment.type) {
            case AttachmentType.TEXTURE_ARRAY_COLOR:
                if (attachment.color_attachment_number === undefined) {
                    throw new Error(`The framebuffer "${this.name}" has an attachment named "${attachment.name}" with an AttachmentType of TEXTURE_ARRAY_COLOR without a 'color_attachment_number' set, this should not be possible, please file a github issue.`)
                }
                this.gl.framebufferTextureLayer(
                    this.gl.FRAMEBUFFER,
                    attachment.color_attachment_number,
                    attachment.texture.webgl_texture,
                    attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level,
                    index
                );
                break;

            case AttachmentType.TEXTURE_ARRAY_DEPTH:
                this.gl.framebufferTextureLayer(
                    this.gl.FRAMEBUFFER,
                    this.gl.DEPTH_ATTACHMENT,
                    attachment.texture.webgl_texture,
                    0,
                    index
                );
                break;
        
            default:
                throw new Error(`setting the texture array index for the attachment named "${attachment.name}" of type AttachmentType.${attachment.type} is not supported.`)
        }

        if (not_bound)
            this.gm.unuse_framebuffer();
    }

    clear() {
        const not_bound = this.gm.framebuffer !== this;
        if (not_bound)
            this.use();
        if (this.use_depth_buffer)
            this.gl.clearDepth(1.0);
        if (this.use_color_buffer) {
            const cc = this.clear_color;
            this.gl.clearColor(cc.x, cc.y, cc.z, cc.w);
        }
        if (this.use_depth_buffer || this.use_color_buffer) {
            this.gl.clear(
                (this.use_color_buffer ? this.gl.COLOR_BUFFER_BIT : 0) |
                (this.use_depth_buffer ? this.gl.DEPTH_BUFFER_BIT : 0)
            );
        }

        if (not_bound)
            this.gm.unuse_framebuffer();
    }

    set_attachment_cube_map_texture_face(attachment_name:string, face:number) {
        const not_bound = this.gm.framebuffer !== this;
        if (not_bound)
            this.use();
        const attachment = this.attachment_info_map[attachment_name];
        switch (attachment.type) {
            case AttachmentType.CUBEMAP_TEXTURE_COLOR:
                if (attachment.color_attachment_number === undefined) {
                    throw new Error(`The framebuffer "${this.name}" has an attachment named "${attachment.name}" with an AttachmentType of CUBEMAP_TEXTURE_COLOR without a 'color_attachment_number' set, this should not be possible, please file a github issue.`)
                }
                this.gl.framebufferTexture2D(
                    this.gl.FRAMEBUFFER,
                    this.gl.COLOR_ATTACHMENT0 + attachment.color_attachment_number,
                    face,
                    attachment.texture.webgl_texture,
                    0
                );
                break;

            case AttachmentType.CUBEMAP_TEXTURE_DEPTH:
                this.gl.framebufferTexture2D(
                    this.gl.FRAMEBUFFER,
                    this.gl.DEPTH_ATTACHMENT,
                    face,
                    attachment.texture.webgl_texture,
                    0
                );
                break;
        
            default:
                throw new Error(`setting the texture array index for the attachment named "${attachment.name}" of type AttachmentType.${attachment.type} is not supported.`)
        }

        if (not_bound)
            this.gm.unuse_framebuffer();
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

            case AttachmentType.TEXTURE_ARRAY_COLOR:
                this.create_attachment_color_array_texture(attachment, attachment_numbers);
                break;

            case AttachmentType.TEXTURE_ARRAY_DEPTH:
                this.create_attachment_depth_array_texture(attachment);
                break;

            case AttachmentType.CUBEMAP_TEXTURE_COLOR:
                this.create_attachment_color_cubemap_texture(attachment, attachment_numbers);
                break;

            case AttachmentType.CUBEMAP_TEXTURE_DEPTH:
                this.create_attachment_depth_cubemap_texture(attachment);
                break;

            default:
                throw new Error(`AttachmentType.${attachment.type} is not yet supported. See framebuffer named "${this.name}".`);
        }
    }

    private create_attachment_depth_array_texture(attachment:AttachmentInfo) {
        if (attachment.texture_array_index === undefined) {
            throw new Error(`The framebuffer "${this.name}" has an attachment named "${attachment.name}" with an AttachmentType of TEXTURE_ARRAY_COLOR without a 'texture_array_index' set, texture_array_index must be set for all array types.`)
        }
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        this.use_depth_buffer = true;

        this.gl.framebufferTextureLayer(
            this.gl.FRAMEBUFFER,
            this.gl.DEPTH_ATTACHMENT,
            attachment.texture.webgl_texture,
            0,
            attachment.texture_array_index
        );
    }

    private create_attachment_color_array_texture(attachment:AttachmentInfo, attachment_numbers:number[]) {
        if (attachment.texture_array_index === undefined) {
            throw new Error(`The framebuffer "${this.name}" has an attachment named "${attachment.name}" with an AttachmentType of TEXTURE_ARRAY_COLOR without a 'texture_array_index' set, texture_array_index must be set for all array types.`)
        }
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.LINEAR;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.LINEAR;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        const attachment_num = this.gl.COLOR_ATTACHMENT0 + this.color_attachment_count;
        
        this.use_color_buffer = true;

        this.gl.framebufferTextureLayer(
            this.gl.FRAMEBUFFER,
            attachment_num,
            attachment.texture.webgl_texture,
            attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level,
            attachment.texture_array_index
        );

        if (attachment.buffer_source)
            this.read_source_color_attachment = attachment_num;

        attachment.color_attachment_number = attachment_num;
        attachment_numbers.push(attachment_num);
        this.color_attachment_count++;
    }

    private create_attachment_color_texture(attachment:AttachmentInfo, attachment_numbers:number[]) {
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.LINEAR;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.LINEAR;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        const attachment_num = this.gl.COLOR_ATTACHMENT0 + this.color_attachment_count;

        this.use_color_buffer = true;
        
        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            attachment_num,
            this.gl.TEXTURE_2D,
            attachment.texture.webgl_texture,
            attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
        );

        if (attachment.buffer_source)
            this.read_source_color_attachment = attachment_num;

        attachment.color_attachment_number = attachment_num;
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

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.DEPTH_ATTACHMENT,
            this.gl.TEXTURE_2D,
            attachment.texture.webgl_texture,
            attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
        );
    }

    private create_attachment_color_cubemap_texture(attachment:AttachmentInfo, attachment_numbers:number[]) {
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        const attachment_num = this.gl.COLOR_ATTACHMENT0 + this.color_attachment_count;

        this.use_color_buffer = true;

        const faces = [
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];
        faces.forEach((face) => {
            this.gl.framebufferTexture2D(
                this.gl.FRAMEBUFFER,
                attachment_num,
                face,
                attachment.texture.webgl_texture,
                attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
            );
        });

        if (attachment.buffer_source)
            this.read_source_color_attachment = attachment_num;

        attachment.color_attachment_number = attachment_num;
        attachment_numbers.push(attachment_num);
        this.color_attachment_count++;
    }

    private create_attachment_depth_cubemap_texture(attachment:AttachmentInfo) {
        var tex_parameters:{[key:number]:number} = 
            attachment.texture_parameters === undefined ? {} : attachment.texture_parameters;
        tex_parameters[this.gl.TEXTURE_MIN_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_MAG_FILTER] = this.gl.NEAREST;
        tex_parameters[this.gl.TEXTURE_WRAP_S] = this.gl.CLAMP_TO_EDGE;
        tex_parameters[this.gl.TEXTURE_WRAP_T] = this.gl.CLAMP_TO_EDGE;
        
        this.use_depth_buffer = true;

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
                attachment.texture.webgl_texture,
                attachment.mipmap_level === undefined ? 0 : attachment.mipmap_level
            );
        });
    }

    use() {
        this.gm.use_framebuffer(this.name);
    }
}
