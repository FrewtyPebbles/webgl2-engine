
wobble_quat = Quat();

rotation_quat = Quat()

speed = 10.0

camera_speed = 150.0

function on_ready(node, engine) 

end

function on_removed(node, engine, parent)

end

function on_update(node, engine, time, delta_time)
    -- print(1.0 / delta_time);
    local im = engine.input_manager
    local gm = engine.graphics_manager

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

    local local_mesh_center = node.model.mesh.center
    local mesh_center = Vec4(local_mesh_center.x, local_mesh_center.y, local_mesh_center.z, 1.0):applyMat4(node:get_world_matrix())

    local camera = engine.main_scene.main_camera_3d;

    camera.rotation:fromMat3(Mat3():fromMat4(Mat4():lookAt(engine.main_scene.main_camera_3d.position, mesh_center, Vec3(0,1,0)):invert()))

    local camera_forward = Vec4(0,0,-1,1):applyQuat(camera.rotation).xyz;

    if camera.position.distance(node.position) > 300 then
        camera.position.add(camera_forward.mul(math.min(camera_speed, camera.position.distance(node.position) - 200) * delta_time));
    elseif camera.position.distance(node.position) < 290 then
        camera.position.sub(camera_forward.mul(math.min(camera_speed, 190 - camera.position.distance(node.position)) * delta_time));
    end
    
    node.rotation = Quat():mul(wobble_quat):mul(rotation_quat)

end


function on_render(node, engine, time, delta_time)
    local gm = engine.graphics_manager
    gm:set_uniform("time", time)
end