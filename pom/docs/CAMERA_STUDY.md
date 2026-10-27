# Camera and scenery study

Open the full game with `?camera-lab=1`, for example `http://127.0.0.1:5173/?camera-lab=1`. This is a local exploration on branch `codex/camera-environment-study`. The normal entry retains the existing rendering and scenery. The separate creator playtest ignores the flag.

## Comparison controls

- Current oblique: original orthographic camera with depth-dependent geometry shear and existing cell squareness compensation.
- Gentle ortho: straight geometry, 20° side angle and 25° downward angle.
- Three-quarter: straight geometry, 35° side and downward angles.
- Front artwork: zero angles, for inspection. The ground is edge-on; increase the downward angle to play.
- Perspective + follow: 35° vertical field of view, 20° downward angle, fixed frontal direction, sideways tracking, horizontal and vertical Pom follow, and landscape scenery. The optional horizon-height lock starts off.
- Side angle can be adjusted from −40° to 40°, downward angle from 0° to 45°. The cube is hidden in this study. Side angle and the Orbit left / Center / Orbit right buttons use the same state. Left/right arrow keys change this angle in 5° steps, or track by 5% of puzzle width in sideways tracking mode.
- Use the puzzle selector for lessons, murals and Japan Challenges. Changing puzzles resets that puzzle normally; changing projection or scenery preserves the logical piece depths, Pom, selection and undo history.
- Pan and zoom work in the camera plane. Fit entire puzzle restores a conservative common scale reserved across the camera presets. Hide the panel on a phone for more space.

## Environment treatments

**Wall & ground set:** choose a fixed wall, a wall that turns with the horizontal viewing direction, or an open curved wall. Each is vertical and meets a real horizontal floor at 90°. The original background image above its measured ground anchor is applied to the wall; the opaque part of the foreground image below the anchor is applied to the floor. The fixed wall’s join changes slope with the camera. The turning wall keeps the join level. The curved wall’s join bows on screen; its center can stay at a fixed height. The front half of the curved set is open so it does not obscure the puzzle. Ground artwork remains world anchored.

**Landscape:** continuous ground plus an upright distant panorama, with hills, side trees and foreground plants at separate world depths. The panorama changes its horizontal bearing with the camera to keep its horizon level; the other scenery stays fixed. This is a stylized 2.5D study with a finite distant backdrop, not a complete 3D landscape. The simple scenery meshes are stand-ins for future art. Trees and plants sit outside the playable floor bounds and are excluded from movement collision and pointer targeting.

Both treatments reuse existing image files unchanged. These images contain painted perspective, lighting and objects; mapping them onto new surfaces can stretch texture and reveal the original perspective. A convincing final landscape needs separately authored terrain, distant scenery and foreground assets after choosing a direction. The study keeps registered landscape artwork fixed while switching views so a different composition cannot disguise camera differences.

Background, ground artwork, landscape elements and the playable ground guide can be toggled independently. Ground shadows use the same piece-shadow system as the game. The guide shows the floor footprint; it does not claim every cell is currently reachable.

## Horizontal orbit and horizon checks

Side movement changes yaw only. With **Keep framing while orbiting** checked (the default), it preserves camera elevation, downward angle, orbit target, distance and orthographic scale, including manually panned or zoomed framing. Explicit camera presets, fitting, resizing and changing downward angle are separate operations.

**Hold horizon height during orbit** centers the turning backdrop or panorama on the actual camera orbit pivot and holds its horizontal distance from that pivot. This makes the projected ground join’s height independent of yaw. It also holds the curved wall’s center height. It cannot level a fixed wall’s join, so that option is disabled for the fixed-wall comparison. Unchecking it uses the puzzle’s original center instead, allowing height drift relative to a different orbit pivot.

The readout stays visible above the scrollable controls. It reports projected ground-join height as a percentage of the canvas and flat-join tilt. The dashed horizontal reference is drawn at the center height. Curved mode explicitly reports “curved”; its edges do not lie on that horizontal reference. Background objects are kept outside a conservative envelope around the puzzle so a turning wall cannot sweep through it. Each scenery treatment establishes its own horizon height; the lock holds that height during its orbit, rather than forcing all treatments to share a composition.

Orbiting leaves the logical puzzle and geometry unchanged. The lab skips rebuilding the board meshes during horizontal camera movement. The normal game retains its cube and camera behavior.

## Perspective and player tracking

Choose **Perspective + follow** to try the Pushmo-inspired experiment. These values are a starting point for comparison, not a reconstruction of Pushmo’s exact camera settings. The field of view ranges from 25° to 60°. Changing it adjusts camera distance to preserve the vertical size at the focus plane; nearer and farther surfaces still change apparent size. Fitting remains a conservative shared board frame rather than a tight perspective fit.

**Camera movement** switches between orbiting and sideways tracking. Tracking translates the camera and focus together along world X, keeping yaw at zero and the downward angle fixed. The side-position slider ranges across ±60% of puzzle width; Track left/right use ±35%. This gives perspective parallax without turning the camera. Orbit mode instead exposes the side-angle slider and rotates around the focus.

Horizontal and vertical follow can be enabled independently in either straight camera mode. Manual panning and zooming pause follow for inspection. A valid movement tap, push/pull or undo resumes smooth follow toward the canvas center on the enabled axes, discarding any sideways tracking offset. Invalid movement taps leave the inspection frame alone. Follow uses the animated player pose and translates in the camera plane, so perspective depth and downward pitch do not leave Pom off-center. Camera movement eases over roughly 0.18 seconds. **Center on Pom** recenters immediately; Fit entire puzzle and explicit camera changes establish a stationary inspection frame until the next gameplay movement. Camera follow changes framing only and does not move world scenery or alter gameplay. Vertical follow can change the visible height of the finite backdrop join; the existing horizon-height option concerns horizontal orbit, not vertical movement.

The sidebar handles wheel, touch and pointer gestures locally so the engine’s document-level input handlers cannot cancel native panel scrolling. Its body scrolls independently, including over explanatory text. Header and horizon readout remain fixed. On narrow screens the expanded panel occupies 34% of viewport height; collapsing it returns that space to the board. Native form controls and keyboard scrolling remain available inside the panel.

## Data and implementation

Camera and scenery choices remain in page memory. The lab uses a disposable progress adapter and nonpersistent control settings; completing a built-in puzzle does not update the normal completion record. Level JSON, movement rules and puzzle collision stay unchanged.

`camera-lab.js` contains the temporary controls, `camera-scenery.js` the scenery geometry. The game routes visual depth shear through `depthSkew()` so prism meshes, markers, outlines, player animation, flag placement and pointer targeting use matching coordinates. Both straight camera modes remove the shear and Y compensation. Perspective uses the engine’s perspective lens and matching screen-to-world rays; the original orthographic lens remains available. Fitting, panning and zooming use the rotated camera basis in the lab.

## Review

Review the same partially pulled state in both environments and all presets, then try a narrow platform, a large mural and a dense Japan Challenge. Check landing taps, hidden surfaces, silhouette readability, flag visibility, shadows, horizon continuity and mobile framing. Front inspection has no usable projected floor area.

Production builds are useful compilation checks, but they do not prove all camera angles and puzzles are correct. This experiment is not a production camera migration.

Initial browser review (2026-10-26): Lesson 1 pulled to depths 1–3, a landing tap onto its first platform, and scenery switching with Pom on that platform; all four camera presets; Pushmo Paradise at desktop size and 390 × 844 with the panel collapsed; cube switching to center view; Strawberry mural framing; scenery layer toggles, including all layers hidden with Pom still visible; and the normal entry without a lab panel. Full game and restricted playtest builds passed. No automated test suite or physical-device review was run. Broader playtesting across the catalog and camera extremes remains part of deciding whether to adopt the camera. Hiding guides retains a transparent guide mesh so the existing character overlay continues to render.

Orbit extension review (2026-10-26, 1292 × 793): checked both ±40° limits for turning, fixed and curved walls and the landscape. Turning-wall join height stayed at 49.61233% with 0° tilt; the landscape horizon stayed at 22.16186%. Downward angle (25°), scale (58.43282 pixels/unit) and camera elevation (8.31448 units) stayed fixed. The fixed wall intentionally tilted by ±19.52547°; the curved wall held its center at 20.86105% and visibly bowed at its edges. With the height lock off, landscape height drifted from 20.12136% at center to 21.11879% at 35°. After manual pan/zoom, the locked height remained 15.86905–15.86906% across left/center/right, with unchanged tilt, scale and elevation. Narrow viewport and collapsed-panel readout were reviewed again; the normal entry still has its cube. Full game and restricted playtest builds passed. These are browser interaction checks and projected-geometry measurements, not physical-device or catalog-wide gameplay certification.

Perspective extension review (2026-10-26): Lesson 1 pulled to depths 1–3 and tapped onto its first two platforms. Follow moved the focus from (2.0000, 1.9586) to approximately (2.3800, 3.3384) while retaining the 20° pitch. At 1292 × 793, left/right tracking moved focus X from 0.6000 to 3.4000, while distance (17.8573), yaw (0), scale (58.43282), horizon height (37.71194%) and tilt (0°) stayed unchanged. FOV endpoints 25° and 60°, perspective orbit and return to Gentle ortho were exercised. Sidebar wheel scrolling over plain text changed scroll position without changing camera scale. At 390 × 844 the expanded controls body had 191 pixels of scrollable height; scrolling, a checkbox and panel collapse were checked. Full game and restricted playtest builds passed. These are browser checks; physical touch scrolling and catalog-wide playtesting remain unverified.

Pan/follow correction review (2026-10-26): reproduced the persistent off-center anchor after manual panning. After the fix, a valid floor movement tap brought Pom from approximately (26.193%, 45.570%) of the canvas to (49.994%, 50.001%), preserving camera distance, pitch and scale. Repeated with a −35% tracking offset; it eased back to center and cleared the tracking offset. With both follow axes disabled, a movement left camera X/Y unchanged. With horizontal follow alone, Pom returned to 49.994% horizontally while camera Y stayed unchanged. Center on Pom, full game build and restricted playtest build also passed; no browser runtime errors were reported.
