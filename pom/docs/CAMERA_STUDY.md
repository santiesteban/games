# Camera and scenery study

Open the full game with `?camera-lab=1`, for example `http://127.0.0.1:5173/?camera-lab=1`. This is a local exploration on branch `codex/camera-environment-study`. The normal entry retains the existing rendering and scenery. The separate creator playtest ignores the flag.

## Comparison controls

- Current oblique: original orthographic camera with depth-dependent geometry shear and existing cell squareness compensation.
- Gentle ortho: straight geometry, 20° side angle and 25° downward angle.
- Three-quarter: straight geometry, 35° side and downward angles.
- Front artwork: zero angles, for inspection. The ground is edge-on; increase the downward angle to play.
- Side angle can be adjusted from −40° to 40°, downward angle from 0° to 45°. The cube retains three side positions and two height positions.
- Use the puzzle selector for lessons, murals and Japan Challenges. Changing puzzles resets that puzzle normally; changing projection or scenery preserves the logical piece depths, Pom, selection and undo history.
- Pan and zoom work in the camera plane. Fit entire puzzle restores a conservative common scale reserved across the camera presets. Hide the panel on a phone for more space.

## Environment treatments

**Wall & ground set:** a fixed vertical painted wall behind the puzzle joins a real horizontal floor at 90°. The original background image above its measured ground anchor is applied to the wall; the opaque part of the foreground image below the anchor is applied to the floor. The join changes slope with the camera. Scenery is anchored in the world and does not follow a pan or zoom.

**Landscape:** continuous ground plus an upright distant panorama, with hills, side trees and foreground plants at separate world depths. The panorama changes its horizontal bearing with the camera to keep its horizon level; the other scenery stays fixed. This is a stylized 2.5D study with a finite distant backdrop, not a complete 3D landscape. The simple scenery meshes are stand-ins for future art. Trees and plants sit outside the playable floor bounds and are excluded from movement collision and pointer targeting.

Both treatments reuse existing image files unchanged. These images contain painted perspective, lighting and objects; mapping them onto new surfaces can stretch texture and reveal the original perspective. A convincing final landscape needs separately authored terrain, distant scenery and foreground assets after choosing a direction. The study keeps registered landscape artwork fixed while switching views so a different composition cannot disguise camera differences.

Background, ground artwork, landscape elements and the playable ground guide can be toggled independently. Ground shadows use the same piece-shadow system as the game. The guide shows the floor footprint; it does not claim every cell is currently reachable.

## Data and implementation

Camera and scenery choices remain in page memory. The lab uses a disposable progress adapter and nonpersistent control settings; completing a built-in puzzle does not update the normal completion record. Level JSON, movement rules and puzzle collision stay unchanged.

`camera-lab.js` contains the temporary controls, `camera-scenery.js` the scenery geometry. The game routes visual depth shear through `depthSkew()` so prism meshes, markers, outlines, player animation, flag placement and pointer targeting use matching coordinates. Orthographic mode removes both the shear and the Y compensation. Fitting, panning and zooming use the rotated camera basis in the lab.

## Review

Review the same partially pulled state in both environments and all presets, then try a narrow platform, a large mural and a dense Japan Challenge. Check landing taps, hidden surfaces, silhouette readability, flag visibility, shadows, horizon continuity and mobile framing. Front inspection has no usable projected floor area.

Production builds are useful compilation checks, but they do not prove all camera angles and puzzles are correct. This experiment is not a production camera migration.

Initial browser review (2026-10-26): Lesson 1 pulled to depths 1–3, a landing tap onto its first platform, and scenery switching with Pom on that platform; all four camera presets; Pushmo Paradise at desktop size and 390 × 844 with the panel collapsed; cube switching to center view; Strawberry mural framing; scenery layer toggles, including all layers hidden with Pom still visible; and the normal entry without a lab panel. Full game and restricted playtest builds passed. No automated test suite or physical-device review was run. Broader playtesting across the catalog and camera extremes remains part of deciding whether to adopt the camera. Hiding guides retains a transparent guide mesh so the existing character overlay continues to render.
