import Engine from "../engine";

export enum MouseButton {
    Left = 0,
    Middle = 1,
    Right = 2,
}

export class InputManager {
    engine:Engine;
    
    private keysDown = new Set<string>();
    private keysPressed = new Set<string>();
    private keysReleased = new Set<string>();
    
    private mouseDown = new Set<number>();
    private mousePressed = new Set<number>();
    private mouseReleased = new Set<number>();
    
    public mouseX = 0;
    public mouseY = 0;
    public mouse_delta_x = 0;
    public mouse_delta_y = 0;
    
    public wheelDelta = 0;
    
    constructor(engine:Engine, private target: HTMLElement = window.document.body) {
        this.engine = engine;
        this.attach();
    }
    
    destroy() {
        this.detach();
    }
    
    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
        this.mousePressed.clear();
        this.mouseReleased.clear();
        
        this.mouse_delta_x = 0;
        this.mouse_delta_y = 0;
        this.wheelDelta = 0;
    }
    
    is_key_down(code: string): boolean {
        return this.keysDown.has(code);
    }
    
    was_key_pressed(code: string): boolean {    
        return this.keysPressed.has(code);
    }
    
    was_key_released(code: string): boolean {
        return this.keysReleased.has(code);
    }
    
    is_mouse_down(button: MouseButton): boolean {
        return this.mouseDown.has(button);
    }
    
    was_mouse_pressed(button: MouseButton): boolean {
        return this.mousePressed.has(button);
    }
    
    was_mouse_released(button: MouseButton): boolean {
        return this.mouseReleased.has(button);
    }

    lock_mouse() {
        this.engine.canvas.requestPointerLock();
    }

    unlock_mouse() {
        document.exitPointerLock();
    }
    
    private attach() {
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        
        this.target.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mouseup", this.onMouseUp);
        
        this.target.addEventListener("mousemove", this.onMouseMove);
        this.target.addEventListener("wheel", this.onWheel, { passive: true });
        
        // Prevent context menu
        this.target.addEventListener("contextmenu", e => e.preventDefault());
    }
    
    private detach() {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        
        this.target.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mouseup", this.onMouseUp);
        
        this.target.removeEventListener("mousemove", this.onMouseMove);
        this.target.removeEventListener("wheel", this.onWheel);
    }
    
    private onKeyDown = (e: KeyboardEvent) => {
        if (!this.keysDown.has(e.code)) {
            this.keysDown.add(e.code);
            this.keysPressed.add(e.code);
        }
    };
    
    private onKeyUp = (e: KeyboardEvent) => {
        if (this.keysDown.delete(e.code)) {
            this.keysReleased.add(e.code);
        }
    };
    
    private onMouseDown = (e: MouseEvent) => {
        if (!this.mouseDown.has(e.button)) {
            this.mouseDown.add(e.button);
            this.mousePressed.add(e.button);
            
        }
    };
    
    private onMouseUp = (e: MouseEvent) => {
        if (this.mouseDown.delete(e.button)) {
            this.mouseReleased.add(e.button);
        }
    };
    
    private onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === this.engine.canvas) {
            // Pointer lock mode → use raw movement
            this.mouse_delta_x = e.movementX;
            this.mouse_delta_y = e.movementY;
        } else {
            // Normal mouse mode
            const rect = this.target.getBoundingClientRect();
            
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.mouse_delta_x += x - this.mouseX;
            this.mouse_delta_y += y - this.mouseY;
            
            this.mouseX = x;
            this.mouseY = y;
        }
    };
    
    private onWheel = (e: WheelEvent) => {
        this.wheelDelta += e.deltaY;
    };
}
