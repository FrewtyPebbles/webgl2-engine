import { GraphicsManager } from "../graphics_manager";
import { ShaderProgram, UBO } from "../shader_program";
import Engine from "../../engine";

type UBOBaseConstructor = new (...args: any[]) => { gm: GraphicsManager }|{ graphics_manager: GraphicsManager }|{ engine: Engine };

type UBOBaseConstructorUNION = new (...args: any[]) => {
    gm?: GraphicsManager;
    graphics_manager?: GraphicsManager;
    engine?: Engine;
};

export interface ParameterMapping {
    class_property:string;
    uniform_property:string;
    type_check?:UBOBaseConstructor|string;
}

const p:ParameterMapping = {
    class_property:"",
    uniform_property:"",
    type_check:"number"
}


export function UniformBufferObjectMixin<TBase extends UBOBaseConstructor>(
    Base: TBase, location:string, parameter_mapping:ParameterMapping[],
    auto_send_buffer_data:boolean = true // TODO: Make it so you can choose whether or not to automatically send the updated buffer or not.
) {
    class UniformBufferObjectMixin extends (Base as UBOBaseConstructorUNION) {
        static shader_programs:ShaderProgram[] = []
        static UBO_dirty:boolean = false;
        constructor(...args:any[]) {
            super(...args);
            for (const parameter of parameter_mapping) {
                const property = parameter.class_property;
                
                // 1. Capture the initial value set by the Base class
                let value = (this as any)[property];

                // 2. Redefine the property with a setter
                Object.defineProperty(this, property, {
                    get: () => (this as any)["stored_" + property],
                    set: (new_value) => {
                        if (value !== new_value) {
                            (this as any)["stored_" + property] = new Proxy(new_value, {
                                set: (target, p, nv) => {
                                    (target as any)[p] = nv;
                                    return this._on_property_change(property, new_value);
                                }
                            });
                            this._on_property_change(property, new_value);
                        }
                    },
                    enumerable: true,
                    configurable: true
                });

                (this as any)["stored_" + property] = value;
            }
        }

        _on_property_change(prop: string, value: any):boolean {
            UniformBufferObjectMixin.UBO_dirty = true;

            if (auto_send_buffer_data) {
                let gm:GraphicsManager|null = null;
                if ("engine" in this) {
                    gm = this.engine!.graphics_manager;
                } else if ("gm" in this) {
                    gm = this.gm!;
                } else if ("graphics_manager" in this) {
                    gm = this.graphics_manager!;
                }
                
                if (gm === null) {
                    console.error(`Couldn't find graphics manager when the property named "${prop}" changed of the UBO at location "${location}".`);
                    return true;
                }
                const data = GraphicsManager.flatten_uniform_array_value(value);
    
                for (const shader_program of UniformBufferObjectMixin.shader_programs) {
                    gm.gl.bindBuffer(gm.gl.UNIFORM_BUFFER, shader_program.ubos[location].webgl_buffer);
                    gm.gl.bufferSubData(
                        gm.gl.UNIFORM_BUFFER,
                        shader_program.ubos[location][prop].offset,
                        data,
                        0
                    );
                }
                gm.gl.bindBuffer(gm.gl.UNIFORM_BUFFER, null);
            }

            return true;
        }

        send_UBO() {
            // TODO

            // After sending set this flag
            UniformBufferObjectMixin.UBO_dirty = false;
        }

        check_UBO():boolean {
            for (const parameter of parameter_mapping) {
                if (!(parameter.class_property in this)) {
                    console.error(`Required UBO class property "${parameter.class_property}" not found in class "${Base.name}".`);
                    return false;
                }
                else if (parameter.type_check !== undefined)
                    if (typeof parameter.type_check === "string") {
                        if (typeof this[parameter.class_property as keyof this] !== parameter.type_check) {
                            console.error(`Required UBO class property "${parameter.class_property}" in class definition "${Base.name}" must be of type "${parameter.type_check}".`);
                            return false;
                        }
                    } else if (this[parameter.class_property as keyof this] instanceof parameter.type_check) {
                        console.error(`Required UBO class property "${parameter.class_property}" in class definition "${Base.name}" must be of type "${parameter.type_check.name}".`);
                        return false;
                    }
            }
            return true;
        }

        static create_UBO(shader_program:ShaderProgram) {

            UniformBufferObjectMixin.shader_programs.push(shader_program);
            
            const gm = shader_program.gm;

            const block_index = gm.gl.getUniformBlockIndex(shader_program, location);

            const block_size = gm.gl.getActiveUniformBlockParameter(
                shader_program,
                block_index,
                gm.gl.UNIFORM_BLOCK_DATA_SIZE
            );

            const ubo_buffer = gm.gl.createBuffer();

            shader_program.ubos[location] = {
                webgl_buffer:ubo_buffer
            } as UBO;

            gm.gl.bindBuffer(gm.gl.UNIFORM_BUFFER, ubo_buffer);

            gm.gl.bufferData(gm.gl.UNIFORM_BUFFER, block_size, gm.gl.DYNAMIC_DRAW);

            gm.gl.bindBuffer(gm.gl.UNIFORM_BUFFER, null);

            gm.gl.bindBufferBase(gm.gl.UNIFORM_BUFFER, shader_program.ubo_counter, ubo_buffer);

            ++shader_program.ubo_counter;

            var uniform_parameters:string[] = [];
            var class_parameters:string[] = [];

            for (var parameter of parameter_mapping) {
                uniform_parameters.push(parameter.uniform_property);
                class_parameters.push(parameter.class_property);
            }

            const ubo_variable_indices = gm.gl.getUniformIndices(
                shader_program,
                uniform_parameters
            );

            if (ubo_variable_indices === null) {
                throw new Error(`Failed to find an uniform buffer object named "${location}" in the shader program named "${shader_program.name}" with the properties named "` + uniform_parameters.join("\", \"") + "\".")
            }

            const ubo_variable_offsets = gm.gl.getActiveUniforms(
                shader_program,
                ubo_variable_indices,
                gm.gl.UNIFORM_OFFSET
            );

            for (var i = 0; i < class_parameters.length; ++i) {
                shader_program.ubos[location][class_parameters[i]] = {
                    label: uniform_parameters[i],
                    index: ubo_variable_indices[i],
                    offset: ubo_variable_offsets[i]
                }
            }
        }
    }
    return UniformBufferObjectMixin as UBOBaseConstructor as TBase & {
        new (...args: ConstructorParameters<TBase>): UniformBufferObjectMixin;
        create_UBO(shader_program:ShaderProgram):void;
    }
}

