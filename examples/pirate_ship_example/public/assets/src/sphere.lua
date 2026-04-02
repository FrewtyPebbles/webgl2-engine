
function on_ready(node, engine) 

end

function on_removed(node, engine, parent)

end

function on_update(node, engine, time, delta_time)
    local gm = engine.graphics_manager
    gm:set_uniform("time", time)
end

function on_render(node, engine, time, delta_time)
end