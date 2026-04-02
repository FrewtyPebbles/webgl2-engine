import { GraphicsManager } from "../graphics_manager";
import { ShaderProgram } from "../shader_program";
import Engine from "../../engine";
import { Mat2, Mat3, Mat4, Vec2, Vec3, Vec4 } from "@vicimpa/glm";
import { UniformValueType, WebGLUniformType } from "./uniform";

export enum MEMORY_USAGE_MODE {
    STATIC_DRAW,
    DYNAMIC_DRAW,
    STREAM_DRAW,
    STATIC_READ,
    DYNAMIC_READ,
    STREAM_READ,
    STATIC_COPY,
    DYNAMIC_COPY,
    STREAM_COPY,
};

function align(offset:number, alignment:number) {
    return (offset + alignment - 1) & ~(alignment - 1);
}

export class UBOMember {
    ubo:UniformBufferObject
    type:ArrayMember | Members | WebGLUniformType
    size:number
    index:number
    offset:number
    memory_view:DataView|null = null

    constructor(ubo:UniformBufferObject, type:WebGLUniformType, index:number, offset:number) {
        this.ubo = ubo;
        this.type = type;
        this.index = index;
        this.offset = offset;
        this.size = this.get_type_size(this.type);
    }

    set_memory_view(memory:ArrayBuffer) {
        this.memory_view = new DataView(memory);
    }

    static flatten_uniform_value(value:UniformValueType):Float32Array {
        if (typeof value !== "number" && typeof value !== "boolean") {
            return new Float32Array(value.toArray())
        } else if (typeof value === "boolean") {
            return new Float32Array([value ? 1 : 0])
        } else {
            return new Float32Array([value])
        }
    }

    set_uniform(value: UniformValueType) {
        if (!this.memory_view) return;

        const view = this.memory_view;
        const off = this.offset;

        // Helper to get raw array from GLM types
        const data = (typeof value === "object" && "toArray" in value) ? (value as any).toArray() : 
                     (Array.isArray(value) ? value : [Number(value)]);

        switch (this.type) {
            case WebGLUniformType.F: 
                view.setFloat32(off, data[0], true); break;
            case WebGLUniformType.I: case WebGLUniformType.B: 
                view.setInt32(off, data[0], true); break;
            
            case WebGLUniformType.F2V: case WebGLUniformType.F3V: case WebGLUniformType.F4V:
                data.forEach((v: number, i: number) => view.setFloat32(off + (i * 4), v, true));
                break;

            case WebGLUniformType.I2V: case WebGLUniformType.I3V: case WebGLUniformType.I4V:
                data.forEach((v: number, i: number) => view.setInt32(off + (i * 4), v, true));
                break;

            case WebGLUniformType.F2M: // Mat2: 2 columns, each treated as vec4
                for(let i=0; i<2; i++) {
                    view.setFloat32(off + (i * 16) + 0, data[i*2+0], true);
                    view.setFloat32(off + (i * 16) + 4, data[i*2+1], true);
                }
                break;

            case WebGLUniformType.F3M: // Mat3: 3 columns, each treated as vec4
                for(let i=0; i<3; i++) {
                    view.setFloat32(off + (i * 16) + 0, data[i*3+0], true);
                    view.setFloat32(off + (i * 16) + 4, data[i*3+1], true);
                    view.setFloat32(off + (i * 16) + 8, data[i*3+2], true);
                }
                break;

            case WebGLUniformType.F4M: // Mat4: 4 columns of vec4
                data.forEach((v: number, i: number) => view.setFloat32(off + (i * 4), v, true));
                break;
        }
    }

    get_struct_member_alignment(type:WebGLUniformType):number {
        switch (type) {
            case WebGLUniformType.STRUCT:
                return 16;
        
            case WebGLUniformType.F:
                return 4;
            
            case WebGLUniformType.I:
                return 4;

            case WebGLUniformType.B:
                return 4;

            case WebGLUniformType.F2V:
            case WebGLUniformType.I2V:
                return 8;

            case WebGLUniformType.F3V:
            case WebGLUniformType.I3V:
                return 16;

            case WebGLUniformType.F4V:
            case WebGLUniformType.I4V:
                return 16;

            case WebGLUniformType.F2M:
                return 16;
            
            case WebGLUniformType.F3M:
                return 16;

            case WebGLUniformType.F4M:
                return 16;
        }
        throw Error("Invalid UBOMember Type.")
    }

    get_type_size(type:WebGLUniformType):number {
        switch (type) {
        
            case WebGLUniformType.F:
                return 4;
            
            case WebGLUniformType.I:
                return 4;

            case WebGLUniformType.B:
                return 4;

            case WebGLUniformType.F2V:
            case WebGLUniformType.I2V:
                return 8;

            case WebGLUniformType.F3V:
            case WebGLUniformType.I3V:
                return 12;

            case WebGLUniformType.F4V:
            case WebGLUniformType.I4V:
                return 16;

            case WebGLUniformType.F2M:
                return 32;
            
            case WebGLUniformType.F3M:
                return 48;

            case WebGLUniformType.F4M:
                return 64;
            default:
                return 0;
        }
    }
}

export class UBOMemberStruct extends UBOMember {
    members:{[key:string]:UBOMember} = {}

    constructor(ubo:UniformBufferObject, members:Members, index:number, offset:number) {
        super(ubo, WebGLUniformType.STRUCT, index, offset)
        
        var current_offset = align(this.offset, 16);       
        
        Object.entries(members).forEach(([name, type], index) => {
            const is_type = Object.values(WebGLUniformType).includes(type as WebGLUniformType) && !(type instanceof ArrayMember);
            const member_align = is_type ? this.get_struct_member_alignment(type as WebGLUniformType) : 16;

            current_offset = align(current_offset, member_align);

            if (type instanceof ArrayMember) {
                const array = new UBOMemberArray(this.ubo, type.type, type.length, this.index, current_offset);
                this.members[name] = array;
                current_offset += array.size;
            } else if (Object.values(WebGLUniformType).includes(type as WebGLUniformType)) {
                const t = type as WebGLUniformType;
                this.members[name] = new UBOMember(this.ubo, t, this.index, current_offset);
                current_offset += this.get_type_size(t);
            } else {
                const sub_struct = new UBOMemberStruct(this.ubo, type as Members, this.index, current_offset);
                this.members[name] = sub_struct;
                current_offset += sub_struct.size;
            }
        });
        
        this.size = align(current_offset - this.offset, 16);
    }

    set_memory_view(memory:ArrayBuffer) {
        this.memory_view = new DataView(memory);
        for (const member of Object.values(this.members)) {
            member.set_memory_view(memory);
        }
    }
}

export class UBOMemberArray extends UBOMember {
    length:number
    elements: UBOMember[]
    constructor(ubo:UniformBufferObject, raw_elements: ArrayMember | Members | WebGLUniformType, length:number, index:number, offset:number) {
        super(ubo, WebGLUniformType.STRUCT, index, offset);

        this.length = length;
        this.offset = align(offset, 16);
        this.elements = []

        if (raw_elements instanceof ArrayMember) {
            this.elements.push(new UBOMemberArray(
                ubo,
                raw_elements.type,
                raw_elements.length,
                index,
                this.offset
            ));
        } else if (Object.values(WebGLUniformType).includes(raw_elements as WebGLUniformType)) {
            this.elements.push(new UBOMember(
                ubo,
                raw_elements as WebGLUniformType,
                this.index,
                this.offset
            ));
        } else {
            this.elements.push(new UBOMemberStruct(
                ubo,
                raw_elements as Members,
                index,
                this.offset
            ));
        }

        for (let i = 1; i < length; i++) {
            let offset = align(this.offset + i * this.elements[0].size, 16);
            if (raw_elements instanceof ArrayMember) {
                this.elements.push(new UBOMemberArray(
                    ubo,
                    raw_elements.type,
                    raw_elements.length,
                    index,
                    offset
                ));
            } else if (Object.values(WebGLUniformType).includes(raw_elements as WebGLUniformType)) {
                this.elements.push(new UBOMember(
                    ubo,
                    raw_elements as WebGLUniformType,
                    this.index,
                    offset
                ));
            } else {
                this.elements.push(new UBOMemberStruct(
                    ubo,
                    raw_elements as Members,
                    index,
                    offset
                ));
            }
        }

        const outer_stride = align(this.elements[0].size, 16);

        this.size = outer_stride * this.length;
    }

    set_memory_view(memory:ArrayBuffer) {
        this.memory_view = new DataView(memory);
        for (const element of this.elements) {
            element.set_memory_view(memory);
        }
    }
}

export class ArrayMember {
    type:WebGLUniformType|Members|ArrayMember
    length:number
    constructor(type:WebGLUniformType|Members|ArrayMember, length:number) {
        this.type = type;
        this.length = length;
    }

    is_type():boolean {
        return Object.values(WebGLUniformType).includes(this.type as WebGLUniformType);
    }

    is_array():boolean {
        return this.type instanceof ArrayMember;
    }
}

export interface Members {
    [key:string]:WebGLUniformType|Members|ArrayMember;
}


export class UniformBufferObject {
    shader_program:ShaderProgram
    graphics_manager:GraphicsManager
    name:string
    raw_members:Members
    members:{[key:string]:UBOMember|UBOMemberArray|UBOMemberStruct} = {}
    size!:number
    gl_buffer!:WebGLBuffer
    gl_ubo_block_index!: number
    gl_ubo_block_size!: number
    memory_usage_mode:MEMORY_USAGE_MODE
    private gl_memory_usage_mode:number
    gl_ubo_index!:number
    static ubo_counter:number = 0
    memory_mirror!:ArrayBuffer
    constructor(shader_program:ShaderProgram, name:string, members:Members, memory_usage_mode:MEMORY_USAGE_MODE = MEMORY_USAGE_MODE.DYNAMIC_DRAW) {
        this.shader_program = shader_program;
        this.graphics_manager = this.shader_program.gm;
        this.name = name;
        this.raw_members = members

        const gl = this.graphics_manager.gl;
        this.memory_usage_mode = memory_usage_mode;
        switch (this.memory_usage_mode) {
            case MEMORY_USAGE_MODE.DYNAMIC_DRAW:
                this.gl_memory_usage_mode = gl.DYNAMIC_DRAW;
                break;
            case MEMORY_USAGE_MODE.STATIC_DRAW:
                this.gl_memory_usage_mode = gl.STATIC_DRAW;
                break;
            case MEMORY_USAGE_MODE.STREAM_DRAW:
                this.gl_memory_usage_mode = gl.STREAM_DRAW;
                break;
            case MEMORY_USAGE_MODE.STATIC_READ:
                this.gl_memory_usage_mode = gl.STATIC_READ;
                break;
            case MEMORY_USAGE_MODE.DYNAMIC_READ:
                this.gl_memory_usage_mode = gl.DYNAMIC_READ;
                break;
            case MEMORY_USAGE_MODE.STREAM_READ:
                this.gl_memory_usage_mode = gl.STREAM_READ;
                break;
            case MEMORY_USAGE_MODE.STATIC_COPY:
                this.gl_memory_usage_mode = gl.STATIC_COPY;
                break;
            case MEMORY_USAGE_MODE.DYNAMIC_COPY:
                this.gl_memory_usage_mode = gl.DYNAMIC_COPY;
                break;
            case MEMORY_USAGE_MODE.STREAM_COPY:
                this.gl_memory_usage_mode = gl.STREAM_COPY;
                break;
        }
    }

    build() {
        const gl = this.graphics_manager.gl;

        this.gl_ubo_block_index = gl.getUniformBlockIndex(this.shader_program.webgl_shader_program!, this.name);
        if (this.gl_ubo_block_index === 0xFFFFFFFF) {
            console.warn(`UBO "${this.name}" not found in shader. It might be entirely unused.`);
        }

        this.gl_buffer = gl.createBuffer()!;
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.gl_buffer);
        
        // calculate offset manually
        let current_offset = 0;
        const names = Object.keys(this.raw_members);
        
        // still get indices for debugging
        const member_indices = gl.getUniformIndices(this.shader_program.webgl_shader_program!, names) || [];

        names.forEach((name, index) => {
            const type = this.raw_members[name];
            const gl_index = member_indices[index] ?? -1;

            let member_align = 16; // Default for structs/arrays
            if (!(type instanceof ArrayMember) && typeof type === 'number') {
                member_align = this.get_alignment_helper(type as WebGLUniformType);
            }

            current_offset = align(current_offset, member_align);

            if (type instanceof ArrayMember) {
                const member = new UBOMemberArray(this, type.type, type.length, gl_index, current_offset);
                this.members[name] = member;
                current_offset += member.size;
            } else if (typeof type === 'number') {
                const t = type as WebGLUniformType;
                const member = new UBOMember(this, t, gl_index, current_offset);
                this.members[name] = member;
                current_offset += member.size;
            } else {
                const member = new UBOMemberStruct(this, type as Members, gl_index, current_offset);
                this.members[name] = member;
                current_offset += member.size;
            }
        });

        this.size = align(current_offset, 16);

        gl.bufferData(gl.UNIFORM_BUFFER, this.size, this.gl_memory_usage_mode);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);

        this.gl_ubo_index = UniformBufferObject.ubo_counter;
        gl.bindBufferBase(gl.UNIFORM_BUFFER, this.gl_ubo_index, this.gl_buffer);
        gl.uniformBlockBinding(this.shader_program.webgl_shader_program!, this.gl_ubo_block_index, this.gl_ubo_index);

        UniformBufferObject.ubo_counter++;

        // create Memory Mirror
        this.memory_mirror = new ArrayBuffer(this.size);
        for (const member of Object.values(this.members)) {
            member.set_memory_view(this.memory_mirror);
        }
    }

    private get_alignment_helper(type: WebGLUniformType): number {
        switch (type) {
            case WebGLUniformType.F: return 4;
            case WebGLUniformType.I: return 4;
            case WebGLUniformType.B: return 4;
            case WebGLUniformType.F2V: return 8;
            case WebGLUniformType.I2V: return 8;
            default: return 16; // vec3, vec4, matrices all align to 16
        }
    }

    bind() {
        const gl = this.graphics_manager.gl;
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.gl_buffer);
    }

    unbind() {
        const gl = this.graphics_manager.gl;
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    }

    apply(bind:boolean = false) {
        const gl = this.graphics_manager.gl;
        if (bind)
            gl.bindBuffer(gl.UNIFORM_BUFFER, this.gl_buffer);
        
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.memory_mirror);

        if (bind)
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    }

    set_uniform(name_offset:string|number, value:any, bind:boolean = false) {
        const gl = this.graphics_manager.gl;
        if (bind)
            gl.bindBuffer(gl.UNIFORM_BUFFER, this.gl_buffer);
        if (typeof name_offset === "string")
            gl.bufferSubData(gl.UNIFORM_BUFFER, this.members[name_offset].offset, value);
        if (typeof name_offset === "number")
            gl.bufferSubData(gl.UNIFORM_BUFFER, name_offset, value);

        if (bind)
            gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    }

    cleanup() {
        const gl = this.graphics_manager.gl;
        gl.deleteBuffer(this.gl_buffer);
    }
}