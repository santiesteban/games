# Flatter opening view — 2 November 2026

**Superseded:** Iván selected persistent geometry correction. The shallow-camera experiment is removed; see 2026-11-02-persistent-projection.md.

Local, uncommitted change above 65ef09f on codex/saturn-performance, alongside the separately requested gameplay/content changes. No push/publication.

## Request and implementation

Iván reports that the fully flat opening puzzle appears to lean/fall toward the viewer and requests a flatter appearance without changing pulled-piece appearance. The downward perspective camera makes the upper plane appear wider because it is closer to the eye.

Use an 8-degree downward camera angle while every piece has zero visual depth, instead of the normal 20 degrees. On the first pull, blend back to the existing requested pitch over 0.3 seconds. If all pieces return to zero (including Undo), restore the shallower view with the same transition. Reduced motion changes directly. Fully flat views do not need the occlusion auto-tilt; normal visibility adjustment resumes after the transition. Already-raised starts, non-perspective views, explicit Camera Lab studies and scenery/design preview tools retain their requested behavior.

This changes the opening camera, including its view of the scenery/floor; it does not warp individual pieces or change geometry, depth, collision, rules, picking transforms, saves, IDs or preferences. Pulled scenes return to the existing camera angle; the first pull has a short camera transition. It is a local visual proposal for tester review, not evidence of approval or deployment.

Files: src/camera-intro.js, src/camera-intro.test.js, src/main.js.

## Verification

114 tests passed; full game and restricted-player production builds passed. Added test checks flat-only pitch reduction, shallow/zero requested pitches, disabled correction and non-perspective bypass.

Disposable Chromium browser comparisons used Pencil and Lesson 1 at 1024×768 with normal motion and 390×844 with reduced motion. Baseline uses the same source with flat-opening eligibility disabled by test-only response interception. Both versions use the same legal first pull. All runs had no page errors. First pull and Undo exercised the flat/raised state changes. Pulled-piece per-cell positions and scales matched baseline exactly, and pulled camera pitch returned to 20 degrees.

Top/bottom projected width ratios for the full puzzle plane (1 is no vertical taper):

| Scene | Desktop before | Desktop after | Phone before | Phone after |
| --- | ---: | ---: | ---: | ---: |
| Pencil | 1.1180 | 1.0464 | 1.1827 | 1.0671 |
| Lesson 1 | 1.0659 | 1.0263 | 1.0595 | 1.0234 |

Before/after opening screenshots were inspected. The perspective taper is reduced, not eliminated. The camera change also shifts the scenery horizon/composition during the flat opening; this is the material visual tradeoff of preserving piece geometry. No physical iPad/Safari review, full-catalog camera sweep, or new performance benchmark was performed. This task does not resolve previously documented isolated frame spikes.

Evidence: this folder contains desktop screenshots, results.json and compare.cjs. The sibling flat-opening-phone folder contains phone/reduced-motion screenshots and results. Scripts use disposable contexts and the independent development server on port 5184; the tester preview is the rebuilt production output at http://127.0.0.1:5183/ . No user storage was reset.
