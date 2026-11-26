# Render3D performance review

This document summarizes a review of Little Ledges' 3D renderer and potential performance improvements. These are code-review findings and experiments to consider, not measured speedups. The game uses LittleJS 1.27.2; the live documentation can describe a newer version, so verify APIs and behavior against the installed version before changing the game.

## Current implementation

- Little Ledges uses LittleJS's `Render3DPlugin`, not Three.js. The renderer uses WebGL2.
- The renderer's ordinary instancing and frustum culling are enabled by default in the installed version. Our front cells share a mesh, but remain separate objects; compatible draws can be batched, subject to render state and material differences.
- Puzzle projection normally uses a custom GPU path when available, with a CPU fallback. The GPU adapter performs a corrected visibility check for projected meshes and patches renderer shader source, so renderer upgrades and alternative draw paths require compatibility testing.
- Extrusion geometry is cached per piece. A changed piece can still rebuild its cached extrusion while its depth changes during a drag. Top surfaces are combined per piece; front cells and extrusion sides still involve per-cell objects.
- The game uses a 2048 × 2048 shadow map and custom shaders that take 32 shadow samples per shaded fragment. It also caps the canvas pixel ratio at 2 and enables antialiasing.
- When shadows are enabled, the installed renderer draws the shadow map once per rendered frame. Existing per-piece extrusion caching is not the same as caching the shadow map across frames.

## Suggested experiments

| Priority | Candidate | What to compare | Tradeoffs and correctness checks |
| --- | --- | --- | --- |
| 1 | Shadow sampling | Compare 32, 16, and 8 samples in the custom shadow shader. | Check shadow softness, banding, and sloped faces at multiple zoom levels. The current shader includes receiver-plane corrections for artifacts. |
| 2 | Shadow-map resolution | Compare 2048 × 2048 with 1024 × 1024. | The smaller map has one quarter the pixels, not necessarily a fourfold overall speedup. Check jagged edges, self-shadowing, and shadows on the floor and background. |
| 3 | Render resolution | Compare a mobile pixel-ratio cap of 1.5 with the current cap of 2. | On a device with a pixel ratio of at least 2, a 1.5 cap renders about 44% fewer pixels. Check puzzle edges, text, and other small details for softness. |
| 4 | Dragging and mesh churn | Profile a large piece while dragging: object creation, mesh uploads, memory, garbage collection, and frame-time spikes. | Cached geometry is per piece, but depth changes can still rebuild that piece. Keep camera, selection, and shadow behavior correct during and after the drag. |
| 5 | Picking and raycasting | Profile pointer movement, tapping, and dragging on large puzzles. Count candidate objects and time spent preparing projected meshes and sorting hits. | A spatial index or narrower candidate set must preserve nearest-hit behavior, camera projection, top-face selection, and pipe interactions. This is primarily an input/CPU opportunity. |
| 6 | Persistent instances | Prototype `InstancedMesh3D` for repeated front cells if object traversal or rebuilding ordinary instance batches is significant. | Existing automatic batching is already enabled. Individual persistent instances are not returned by the built-in raycast helpers; picking needs a separate solution. The custom GPU projection adapter intercepts `drawMesh`, so persistent-instance rendering also needs compatibility work. |
| 7 | Mesh updates and combination | Test combining compatible side geometry per piece or using `dynamicDraw` for geometry whose vertex layout stays fixed. | `dynamicDraw` is not suitable when vertex count or ordering changes. Preserve per-cell picking, distinct materials, coloring, and shadow casting. |
| 8 | Mesh lifetime | Check GPU memory and uploads during repeated drags and level changes; investigate explicit disposal of meshes that are no longer used. | Some meshes are shared. Do not dispose a mesh solely because one object was destroyed without establishing ownership and confirming no other object needs it. |
| 9 | Outlines and back faces | Profile the outline-rendering loop and assess whether reusable edges can be cached or batched. Separately test single-sided rendering for meshes that never need their backs. | Outlines must remain aligned at different camera angles and zoom levels. Some meshes need both sides for viewing or picking; the installed shadow pass disables face culling, so changing `doubleSided` does not automatically reduce its cost. |

Reducing shadow sampling and reducing the shadow-map size are separate experiments: one changes work done when shading receiving surfaces, while the other changes the resolution and cost of the shadow map. Compare each independently before combining them.

## Shadow-map caching

Reusing the shadow map across unchanged frames may reduce idle work, but it is not a documented switch in our installed renderer and would need careful implementation. Invalidate the map when a caster, relevant projection, light, or shadow configuration changes. In particular, when a second piece is pulled out, its shadow must appear correctly on a piece that was already pulled out. Do not skip a redraw merely because the receiving piece itself has not moved.

## Measurement plan

Start with a minimal Capacitor Android build and profile on at least one physical phone or tablet; an emulator is useful for functional checks but is not a reliable substitute for device GPU measurements. Record the device, WebView version, viewport, pixel ratio, level, and settings. Use the same large puzzle and repeat these scenarios:

1. Idle after the scene settles.
2. Drag and pull a large piece, including repeated drags.
3. Move and jump with Pom.
4. Rotate and zoom the camera.
5. Pull one piece, then pull another that should cast a shadow on it.

Compare frame-time distributions and visible stalls, not only average FPS. Also inspect CPU time, draw calls, mesh uploads, memory, and graphics cost where available. First compare shadows enabled and disabled, then change one setting at a time. Record before/after results and visually inspect each candidate before adopting it.

## Version and upgrade caution

The live Render3D documentation can be ahead of LittleJS 1.27.2. For example, newer documentation lists `MeshCollider`, which is not present in our installed source; it describes collision geometry and is not an obvious drop-in replacement for our cell-selection raycasts. Do not upgrade solely for a presumed performance benefit. Any upgrade needs regression checks for the custom projection adapter, shadows, picking, and rendering.

## References

- [Render3D overview](https://killedbyapixel.github.io/LittleJS/docs/Render3D.html)
- [Render3DPlugin](https://killedbyapixel.github.io/LittleJS/docs/Render3D.Render3DPlugin.html)
- [InstancedMesh3D](https://killedbyapixel.github.io/LittleJS/docs/Render3D.InstancedMesh3D.html)
- [Mesh](https://killedbyapixel.github.io/LittleJS/docs/Render3D.Mesh.html)
- Game implementation: `pom/src/main.js`, `pom/src/shadow-materials.js`, and `pom/src/puzzle-projection-gpu.js`.
