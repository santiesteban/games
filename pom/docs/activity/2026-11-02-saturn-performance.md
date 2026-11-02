# Saturn runtime performance — 2 November 2026

Implemented and verified locally; no push or publication.

## Source and isolation

Release baseline: c54fc4d72525e19990f9ab8732ddb38c8e41eac1, identified by the prior developer's firsthand handoff and matching local release worktrees. Remote verification in this session failed DNS resolution; current remote state is not independently confirmed. The previous developer reports this revision deployed successfully on 1 November.

Implementation: /Users/ivansantiesteban/.codex/worktrees/saturn-performance/games, branch codex/saturn-performance, based on c54fc4d. Changes are an uncommitted focused diff. The canonical checkout remains on divergent 3e8f80b with preserved mixed changes; no source edits or resets were made there. Test server used separate port 5183. No other chat was contacted.

## Measured cause and change

The bounded profiled baseline reproduced severe sustained stalls. In the walking CPU profile, paddedCutout accounts for about 9.61 seconds of sampled self time; cardGeometry and mask solid checks add about 1.34 seconds. All three interaction profiles identify the same padding hotspot.

The old per-asset geometry cache cleared every variant when a fourth was needed. The approved Daisy layout has four tree-a placements with different ground clipping. A camera-dependent scenery rebuild repeatedly evicted and regenerated these variants; it could also delete backing textures still referenced by an earlier placement. The fix retains every variant used in the current scene and prunes unused variants only after rebuilding objects. Asset identity, material and ground clipping remain cache keys. Style changes still invalidate geometry. No art, rules, animation timing, controls, IDs, storage keys or saved formats changed.

Files: src/modular-scenery.js, src/scenery-geometry-cache.js, src/scenery-geometry-cache.test.js. Two new regression tests cover more than three live variants, reordered placements, asset identity, pruning, invalidation and disposal exactly once. Live retained variants are bounded by current placements; old and new variants may temporarily coexist during rebuild.

## Comparable measurements

Disposable Chrome 156.0.8078.79, viewport 747 × 763 CSS pixels, DPR 2, headed browser, Saturn / Daisy Meadow, shadows on, lightbox, eight legally opened pieces, 6x CPU slowdown. Same legal setup, depths and complete route definitions verified equal across all four runs. Original saturn-quick-v1 workload retained, with a CPU profile per segment and local URL/root adjustments. These are local Vite development-server measurements of identified release source, including the LittleJS debug build, not measurements of the deployed production bundle. Each entire run took 31–60 seconds. Source fingerprints were stable within each run. Tests used fresh browser contexts, leaving user progress and drafts untouched.

p95 animation callback interval, milliseconds (lower is better):

| Segment | Baseline | Fixed clean run 1 | Fixed clean run 2 |
| --- | ---: | ---: | ---: |
| Walking | 565.7 | 17.6 | 18.4 |
| Push/pull | 566.7 | 17.6 | 18.4 |
| Camera | 550.6 | 17.6 | 18.7 |

Baseline frames above 50 ms: 22/22 walking, 27/27 push/pull, 11/73 camera. Fixed: 1/502, 1/96, 1/72; repeat: 1/503, 1/96, 1/69. Confirmation frames above 50 ms: 2/504, 1/97, 1/72. No paddedCutout self samples occur in the fixed interaction profiles. This supports removal of the sustained cache-thrashing bottleneck; it is not a claim that all hitches are gone.

Worst fixed intervals remain 515.8/300.1/332.4 ms; repeat 450.7/266.2/316.7 ms. Profiling setup occurs near segment boundaries and may contribute; these maxima have not been attributed. Lower p95 alone must not hide them. The first fixed run overlapped verification builds and is secondary evidence only; the fixed repeat and confirmation runs had no overlapping build activity. The profile harness is a diagnostic variant of the original quick test, not an exact uninstrumented run.

## Verification and limits

- 110/110 game tests passed (108 existing, 2 added).
- Full game and restricted-player production builds passed.
- Same legal walks arrived at intended destinations; push/pull witnesses completed without page errors.
- Separate browser check against release and fixed modules passed legal manipulation, undo and reset state equality, with no page errors. Normal and overview screenshots were inspected; scenery placement, artwork, shadows and controls remained visually consistent. This is representative visual review, not pixel-perfect coverage of every scene.
- Git whitespace check passed.
- No physical iPad/Safari validation, GPU presentation measurement, full catalog walkthrough or new creator end-to-end coverage. Synthetic CPU throttling on the Mac does not model an iPad's GPU/memory. Existing compatibility tests passed; no storage or shared rules changed.

## Evidence and integration

Artifacts: /Users/ivansantiesteban/Documents/ChatGPT/Little Ledges Game/performance-baselines/2026-11-02-developer/

before/, after/ (secondary), after-repeat/, after-confirm/ contain source fingerprints, timings, witnesses and CPU profiles. visual/ contains normal/overview before-and-after screenshots and checks.json. profile-quick.cjs, repeat-quick.cjs and visual-check.cjs preserve the diagnostic harnesses; they reference the isolated checkout and port 5183. Reuse existing Playwright installation as recorded in the scripts.

Review and integrate only this branch's focused diff against the release lineage. Do not copy the canonical checkout's complete mixed diff or reset its history. Publication needs separate authorization. Remaining performance work should first attribute the isolated worst-frame stalls with a bounded targeted trace; do not infer iPad results from these desktop numbers.
