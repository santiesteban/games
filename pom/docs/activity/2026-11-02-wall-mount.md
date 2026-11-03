# Puzzle against the back wall — 2 November 2026

User approved moving the complete scene toward the puzzle as equivalent to moving the complete puzzle back. Gameplay now translates the wall, ground, decorations, supports and projected scenery shadows together until the painted wall is 0.002 world unit behind the puzzle cardboard back (wall Z -0.082, cardboard back -0.08). Scenery pick records, contact records, reference points and bounds receive the same translation. Shared meshes are unchanged. Authored arrangement, relative spacing, puzzle geometry, logical depths, movement, camera framing and saves remain unchanged.

The mounted scenery wall is world anchored at zero yaw rather than turning with the camera; a turning wall at contact would cut through the puzzle on rotation. Camera Lab and authoring previews keep their prior controls and spacing. All gameplay puzzles, including Japan and the restricted player, use the shared mounting path. Original artwork fallback mounts too. Cached updates retain the translated scene without applying the offset again. No saved background configuration is rewritten.

124 tests pass. Both game and restricted builds pass. Disposable Chrome desktop/phone checks cover Pencil, Saturn and Lesson 1 at three zoom levels, square faces, wall contact, face selection, pulling and elevated walking, without page errors. Additional Japan, fallback artwork and camera rotation checks pass. Representative screenshots inspected; no physical-device or full-catalog visual sweep. Local evidence is in ignored local-only/wall-mount/. No commit or push for this change yet.

## Wall–ground join line

Added a depth-tested line across the mounted wall–ground join. Color and thickness come from the game board frame (currently #111111 and 2 CSS pixels). The quad is constructed in screen space and unprojected onto the join plane, so camera zoom does not scale the stroke. It remains behind puzzle faces and foreground decorations, unlit and without casting shadows. Geometry is cached between camera/layout changes; style lookup is cached per viewport size. A small forward clearance avoids fighting with the wall. Desktop and phone checks at three zoom scales measured 2 pixels within 0.000001 pixel; screenshots were inspected, including rendered pixels at an unobstructed part of the line. Both builds pass. Evidence remains under local-only/wall-mount/. Not pushed.

## Fixed-width floor grid

Floor-grid strips now project their endpoints to screen space, expand by one CSS pixel on each side, then intersect the resulting corner rays with the floor plane. This preserves their world placement, depth occlusion, color and opacity while maintaining a 2-pixel perpendicular width in perspective, including along each receding line. Geometry is reused while camera, bounds, visibility and viewport remain unchanged; replaced meshes are disposed. Invisible guide layers remain registered as before. Desktop/phone browser checks at three zoom scales measured both ends of all 14 Pencil grid strips within 0.000001 pixel of 2. Screenshots inspected; both builds pass. Evidence: local-only/wall-mount/grid-checks.json and grid screenshots. No new push.

## Tighter seating after visual review

User still perceived a small stand-off. Advanced the complete scenery set by another 0.077 unit: wall Z is now -0.005, just behind the flat front plane, with rear cardboard seated into the wall. This supersedes the earlier -0.082 placement. Front artwork remains in front of the wall, with a deliberate small clearance against depth fighting; pulled-piece depths and rules remain unchanged. Updated mounting regression passes; all 124 tests and both builds pass. Japan, fallback and rotated-view browser checks pass.
