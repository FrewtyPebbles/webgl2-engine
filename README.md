# Vanta Game Engine

The Vanta game engine is a game engine designed with a portability first mindset. The first backend for Vanta is WebGL2 based allowing for great cross platform support.

## The Runtime

The engine runtime currently uses a lua frontend via a [wasmoon](https://github.com/ceifa/wasmoon) web assembly runtime. End developer game code is written in lua to abstract away the game code from the engine implementation language itself. The reasoning behind this is that in the future it will be easier for me to write other posibly native backends for the engine with other langauges or apis like C++ with Vulkan or DX12.

## Current Features:

 - PBR Materials (Not all are supported yet)

 - PBR point and directional Lighting

 - Robust point and directional shadows

 - Lua based game code frontend

 - Versatile Shader Pipeline

 - Scene and Node based rendering

 - Inheritance based Node classes

 - Asyncronous asset loading

## Todo Features:

 - Colliders and a collider system

 - Image Based Lighting

 - Spot lights

 - Area lights

 - glTF file support

 - IDE

 - Better 2D API and layout control nodes

 - Create a sandboxed lua API

## Features I Would Like to Add:

 > I am only one developer, so there is only so much I can do on my own. I am open to contributions though, so if you are interested please feel free to submit a pull request or get in touch!

 - A single scripting language that can be interpreted as bytecode and seamlessly be compiled into shaders.
     - **My Thoughts** : I will likely finish the shader language since glsl (the current choice) does not include certain necissary features for sanity. Some of these features include:
         - Multi-file shaders/importable functions
         - Struct member functions
         - Namespaces
    
 - A domain specific asset file format which stores node trees and scenes in a zipped json and binary combination format. The asset importer will be able to convert OBJ and glTF files to this format.
     - **My Thoughts** : This is very do-able and would do alot for my own and the end game developer's sanity. It will also make things much easier when I try to add an actual editor.

 - A primary WebGPU backend which falls back to the Webgl2 backend.
     - **My Thoughts** : This will likely require alot of refactoring and creating a second compilation backend for the shader language since WebGPU uses WGSL. For me, this is not a priority at the moment.
