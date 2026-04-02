
wobble_quat = Quat();

rotation_quat = Quat()

speed = 10.0

camera_speed = 150.0
camera_look_speed = 10.0

camera_yaw = 0.0;
camera_pitch = 0.0

function wrap(val, min, max)
    local range = max - min
    return ((val - min) % range) + min
end

function on_ready(node, engine) 
    
end

function on_removed(node, engine, parent)

end

function on_update(node, engine, time, delta_time)
    local gm = engine.graphics_manager
    gm:set_uniform("time", time)
    -- print(1.0 / delta_time);
    local im = engine.input_manager
    local gm = engine.graphics_manager

    if im:was_mouse_pressed(0) then
        im:lock_mouse();
    end

    if im:is_key_down("KeyA") then
        rotation_quat:mul(Quat():setAxisAngle(Vec3(0,1,0), speed/5.0 * delta_time))
    end
    if im:is_key_down("KeyD") then
        rotation_quat:mul(Quat():setAxisAngle(Vec3(0,1,0), -(speed/5.0) * delta_time))
    end
    
    local forward = Vec3(-1, 0, 0):applyQuat(rotation_quat)
    local right = Vec3(0, 0, -1):applyQuat(rotation_quat)
    
    local wobble_pitch = math.sin(time * 0.002) * 0.15
    local wobble_roll = math.cos(time * 0.002) * 0.10
    
    -- rebuild wobble every frame
    wobble_quat = Quat()
    :setAxisAngle(forward, wobble_pitch)
    :mul(Quat():setAxisAngle(right, wobble_roll))
    
    if im:is_key_down("KeyW") then
        node.position:add(forward:clone():mul((100.0 + speed) * delta_time))
    end
    
    if im:is_key_down("KeyS") then
        node.position:add(forward:clone():mul(-(100.0 + speed) * delta_time))
    end

    node.rotation = Quat():mul(wobble_quat):mul(rotation_quat)
    
    local local_mesh_center = node.model.mesh.center
    local mesh_center = Vec4(local_mesh_center.x, local_mesh_center.y, local_mesh_center.z, 1.0):applyMat4(node:get_world_matrix())
    
    local camera = engine.main_scene.main_camera_3d;
        
    local camera_right = Vec4(1,0,0,1):applyQuat(camera.rotation).xyz;
    
    camera_yaw = 
    wrap(
        camera_yaw + im.mouse_delta_x * camera_look_speed * delta_time * math.pi / 180,
        0,
        2 * math.pi
    );
    camera_pitch =
    math.max(
        -math.pi/2 + 0.01,
        math.min(
            math.pi/2 - 0.01,
            camera_pitch + im.mouse_delta_y * camera_look_speed * delta_time * math.pi / 180
        )
    );
    
    local yaw_quat = Quat():setAxisAngle(Vec3(0, 1, 0), camera_yaw)
    local pitch_right = Vec3(1, 0, 0):applyQuat(yaw_quat)
    local pitch_quat = Quat():setAxisAngle(pitch_right, camera_pitch)
    
    camera.rotation = pitch_quat:mul(yaw_quat)
    
    local camera_forward = Vec4(0,0,-1,1):applyQuat(camera.rotation).xyz;
    
    local offset = camera_forward:clone():mul(150)
    camera.position = mesh_center.xyz:clone():sub(offset)
        

end


function on_render(node, engine, time, delta_time)
end