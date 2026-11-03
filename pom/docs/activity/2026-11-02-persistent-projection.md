# Persistent puzzle projection — 2 November 2026

Implemented locally on codex/saturn-performance above 65ef09f, alongside Iván’s previously requested pack-count, victory and content changes. No new commit, push or deployment. The older divergent canonical checkout is preserved.

## Approved direction and subsequent defects

Iván selected persistent geometry correction after comparing a shallower opening camera, independent per-piece correction and an opening-only fade. The shallow-camera source experiment is removed. The persistent approach uses one common render-space map across connected puzzle surfaces and preserves the requested camera angle. The prototype’s horizontal-only correction caused tall shapes and a squeezed flag at close zoom. Moving only Pom’s centre also failed to carry his body consistently with the corrected walls. Those shortcomings are addressed in the integrated version.

## Implementation

src/puzzle-projection.js defines a forward/inverse render-space map and cached mesh transformation. At each depth, projected front-plane horizontal/vertical cell dimensions agree across heights and zoom distances. The ground plane is unchanged. Fronts, sides, tops, cardboard backs, the flag/badge, selection glow/outlines, walking markers and Pom’s complete character/child meshes use this map. Original logical meshes and authored data remain available; shared original meshes are never mutated.

Per-object copies are reused. Camera/pose/source changes invalidate only the needed data; unchanged frames skip vertex rewrites. Removed/replaced copies are disposed. Full world matrices handle Pom’s billboard rotation and child hierarchy. Camera follow/occlusion continue using logical coordinates; the correction is applied to render meshes rather than moving only the character anchor. Camera Lab/non-perspective and authoring preview modes retain their existing rendering.

Visible corrected tops/faces are selected using actual rendered triangles. Drag handles use corrected projections and inverse-map grabbed points back into the board. Floor targeting is unchanged. No grid, movement/manipulation collision rule, depth, stable ID, save/draft format, storage key or preference migration is introduced. The renderer is shared by the game and restricted player.

Files: src/puzzle-projection.js, src/puzzle-projection.test.js, src/main.js, src/movement-markers.js, src/selection-lightbox.js. Public README/camera documentation describe the selected rendering. Earlier camera-intro source changes are removed. Private onboarding mirror receives the factual technical update; this release lineage does not contain the private onboarding pack.

## Verification

- 117/117 tests passed; full game and restricted-player builds passed.
- Projection tests cover square cells/badge quads at five heights, four depths, four zoom distances and three pitches; inverse round trips; unchanged ground; disabled/side-view bypass; shared-source preservation; unchanged-frame caching; resource disposal; and rotated character matrices.
- Browser checks on 1024×768 and 390×844 used Pencil, Saturn and Lesson 1. Cell aspect ratios at three zoom levels were within 0.001 of square; actual measured errors were below 0.000001. Native face selection and available elevated walking-target clicks passed without page errors.
- Close-up flag screenshots were inspected. Pointer dragging with optional arrows and a shared-rules-verified legal Peach victory passed.
- Both production builds loaded. The restricted player opened a valid 32×32 puzzle, pulled and undid a piece, and preserved a seeded normal-game progress string.
- Saturn near-flag testing replays legal setup and walks to (13,1,0), then checks the adjacent upper ledge. Mesh transforms for Pom’s body and facial parts agree with the puzzle map to floating-point tolerance. The checked upper ledges were (13,1,0) and (12,1,0), the latter beside the flag wall matching Iván’s clarification. Maximum body/face mapping error was about 0.000001 world unit. Close screenshots were inspected with a clear full outline beside the wall. Specific evidence and screenshots are in the same folder.
- An optional arrow Enter-key check did not change depth. A correction-disabled comparison produced the same result, so it is not established as a projection regression. Pointer dragging passed; keyboard activation remains a separate pre-existing-behavior investigation, not a claimed fix.
- Git whitespace check passed. All browser test contexts were disposable; user progress/drafts were not cleared. No physical iPad/Safari test or full-catalog victory/occlusion sweep was performed. This is a representative integration check, not proof that every possible clipping case is resolved.

## Bounded performance check

One Saturn quick run: same eight legally opened pieces, 747×763 CSS pixels, DPR2, Chrome 156, shadows on, lightbox, synthetic 6× CPU slowdown; source fingerprints stable. Local Vite debug/development source, not a physical iPad measurement. No overlapping builds.

p95 callback intervals: walking 33.8 ms, push/pull 34.3 ms, camera 17.7 ms. Worst intervals: 766.8/516.5/349.0 ms. This remains far below the original sustained 550–583 ms stalls, but is an increased CPU cost compared with the earlier cache-fix-only 17.6–18.7 ms p95 runs. Isolated spikes remain, and a single short run does not attribute all of them. Profiles show mesh projection/upload work; these results do not establish device performance. Future performance work should consider moving this computation to the renderer while retaining accurate picking, rather than dropping verified geometry/input behavior.

## Local review and artifacts

http://127.0.0.1:5183/ serves the rebuilt production game. http://127.0.0.1:5184/ now serves the same integrated source through a normal development server, replacing the injected trial server. Reload to review. The temporary restricted-player test server on 5185 is stopped after checking.

Evidence: /Users/ivansantiesteban/Documents/ChatGPT/Little Ledges Game/bug-fixes/2026-11-02/persistent-projection/

checks.json records aspect/selection/walking checks; detail-checks.json and close-flag/Peach screenshots cover focused checks; built-checks.json covers both builds; Saturn clipping JSON/screenshots cover near-goal character geometry; arrow-keyboard-comparison.json records the separate keyboard limitation; performance/ contains timings, witnesses, source hashes and CPU profiles. Diagnostic scripts are saved beside them.

## GPU rendering follow-up

The CPU mesh path above is now the reference/fallback. Default rendering uses the same mapping in colour and shadow vertex programs; CPU meshes are prepared on demand for picking. See `2026-11-02-gpu-projection.md` for final verification, bounded measurements and remaining limits.
