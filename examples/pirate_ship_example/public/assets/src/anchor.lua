
function on_ready(node, engine) 

end

function on_removed(node, engine, parent)

end

function on_update(node, engine, time, delta_time)
    local gm = engine.graphics_manager
    gm:set_uniform("time", time)
    node.position.y = node.position.y + math.cos(time * 0.005)
end