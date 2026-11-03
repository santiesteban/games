# GPU puzzle projection — 2 November 2026

The approved persistent perspective now renders through the GPU by default in the game and restricted player. No camera or logical puzzle-rule changes, engine/dependency edits, new save format, commit, push or deployment. `?projection=cpu` retains the reference/fallback path; `#canvasWrap[data-puzzle-projection]` identifies the active backend.

## Implementation

`puzzle-projection-gpu.js` applies the same world-space mapping as `puzzle-projection.js` to colour and shadow vertex programs. The context-local adapter recognizes exact LittleJS 1.27.2 vertex signatures; unsupported signatures or failed patched compilation fall back to the CPU correction. Instance tags use copied draw matrices; source objects/matrices and scenery remain untouched. Camera-dependent uniforms update only when their values change. Conservative transformed bounds replace undeformed culling spheres; the final implementation uses analytic box extents and four height/depth corners rather than the slower initial corner enumeration. Picking temporarily uses cached corrected CPU meshes and restores originals afterward. Flag, complete Pom hierarchy, markers and selection follow the same mapping.

This adapter depends on the pinned engine shader layout. Revalidate both shader passes when upgrading LittleJS. CPU picking, board geometry rebuilding on manipulation and ordinary render work remain CPU costs.

## Bounded measurements

Chrome 156, Saturn, eight legally opened pieces, 747×763 CSS viewport at DPR2, shadows and lightbox, synthetic 6× CPU throttle. Development build, disposable contexts, no overlapping builds/timed runs; source stable during every run. These are local observations, not physical iPad measurements or an overall speed multiplier.

| Run | Walking p95 ms | Push/pull p95 ms | Camera p95 ms |
| --- | ---: | ---: | ---: |
| CPU reference | 34.1 | 35.1 | 18.5 |
| CPU repeat | 34.0 | 34.4 | 17.7 |
| GPU initial, conservative no culling | 18.5 | 34.1 | 18.7 |
| GPU repeat, conservative no culling | 17.5 | 33.6 | 32.4 |
| GPU expensive bounds (rejected) | 33.4 | 34.0 | 17.6 |
| GPU final analytic bounds | 17.5 | 33.0 | 32.8 |

Walking improved consistently except for the rejected expensive-bounds experiment. Manipulation remains about 33–35 ms p95; whole-board extrusion rebuilds are a next investigation. Camera median stayed about 16.7 ms, but p95 varied and the final run is worse than the CPU reference by that metric; do not claim camera improvement. The command-driven camera segment has differing sample counts (CPU 134/135, final GPU 85), so tail estimates are especially noisy. Isolated stalls remain: final walking/pull/camera worst intervals 567.7/383.8/216.2 ms. No claim that all hitches are fixed.

## Verification

123 tests pass, including mapping/inverse, shared-source preservation, hierarchy matrices, corrected bounding containment, shader matching/compile fallback, tagging and culling restoration. Both production builds pass using Vite's runner config loader (avoids writing through the temporary dependency symlink into the canonical checkout).

CPU/GPU screenshots of Pencil and Saturn near the flag are visually equivalent. Mean absolute channel differences were 0.000231 and 0.002925 out of 255. Desktop and phone checks cover square faces at zoom, native selection and elevated walking in Pencil, Saturn and Lesson 1. Pointer arrow dragging and a legal complete Peach victory pass with the GPU default. Production smoke checks assert the GPU backend in both players, pull/undo in the restricted player and unchanged seeded normal-game progress. No full-catalog/device sweep; shader fallback is covered by unit tests rather than physical GPU failure injection.

Evidence and diagnostic scripts: `bug-fixes/2026-11-02/gpu-projection/` in the Little Ledges project mirror. All timed runs, including rejected bounds, are retained. Prior persistent-projection artifacts contain focused gameplay and built-player checks. Local preview: http://127.0.0.1:5184/ (development), http://127.0.0.1:5183/ (production).
