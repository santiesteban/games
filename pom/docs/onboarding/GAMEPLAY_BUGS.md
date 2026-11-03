# Gameplay bug log

## BUG-001 — Pom appears to float after winning certain levels

**Reported:** 30 October 2026 by Iván. **Status:** Open; source investigation completed, visual reproduction pending. **Priority/owner:** Unassigned.

**Example:** Peach. Other levels with similar goal placement may be affected; scope is unverified.

**Reproduction as reported:** Complete Peach by reaching the flag. Exact build, device, route and starting state have not yet been recorded.

**Observed:** During the win presentation, Pom appears to float in the air.

**Expected:** Find a better victory presentation in which Pom takes the flag's spot and appears naturally supported. Determine the correct placement and transition without assuming the cause or changing puzzle rules.

**Investigation/acceptance:** Reproduce on the reported level and record build, device, route and screenshots. Inspect flag position, supporting geometry and victory placement/animation; test representative goals at different heights and depths. Verify that Pom appears grounded at the intended flag location without clipping or altering level completion, and report any remaining exceptions. No fix or release is authorized by this bug record alone.

## BUG-002 — Whole app zooms on iPad, hiding gameplay controls

**Reported:** 30 October 2026 by Iván. **Status:** Open; QA documented; physical-iPad reproduction pending. **Priority/owner:** Prioritized; assigned to Developer / Integrator by Iván on 30 October 2026.

**Environment:** iPad tablet, game pinned to the Home Screen. Exact iPad model, OS/browser version and game build are unknown.

**Steps reported:** Open a level, pinch to zoom in on the game, then rapidly tap/click to pull pieces.

**Observed:** The whole app becomes zoomed in, not just the game view. Push/Pull and Start Over controls move out of view and become inaccessible.

**Expected:** Game zoom and rapid manipulation should leave the app layout and essential controls accessible. The desired behavior of pinch and tap gestures should be confirmed during investigation.

**Investigation/acceptance:** Reproduce in the pinned Home Screen experience on an iPad; capture model, OS, build, level and exact gesture sequence. Determine whether browser viewport zoom, gesture handling or layout is responsible without assuming a cause. Check repeated taps, pinch and recovery of controls, including Push/Pull and Start Over; verify other supported touch layouts and accessibility implications of any proposed change. Browser simulation does not establish physical-iPad verification. Iván subsequently assigned the investigation and fix to the developer on 30 October 2026; publication is not authorized by this assignment.



## BUG-003 — Pack progress shows 18 as the total for every pack

**Reported:** 2 November 2026 by Iván. **Status:** Open; not independently reproduced. **Priority/owner:** Unassigned.

**Steps reported:** Open the level-pack listing and inspect the completion count for packs with different numbers of levels. Exact build, device and affected pack examples have not yet been recorded.

**Observed:** Every level pack displays a progress count in the form “x / 18,” regardless of its actual number of levels.

**Expected:** Each pack's denominator reflects the actual number of levels in that pack; its numerator reflects that pack's completion accurately.

**Investigation/acceptance:** Record build and device, reproduce with named packs of different sizes and compare the displayed numerator and denominator with their actual contents and saved completion. Check empty packs and any filtered or locked levels according to the intended pack rules. Do not assume a cause or modify saved progress. No fix or release is authorized by this record alone.


## BUG-004 — Japan Challenges mountains cover puzzle pieces

**Reported:** 3 November 2026 by Iván. **Status:** Open; not independently reproduced. **Priority/owner:** Unassigned.

**Steps reported:** Play Japan Challenges levels and observe the mountains near the background. Specific level, camera position, device and build remain to be recorded.

**Observed:** Mountain elements near the background cover some puzzle pieces.

**Expected / requested direction:** Puzzle pieces remain visible. Combine the mountains with the background, as Iván requested, so they no longer overlap the playable pieces.

**Investigation/acceptance:** Identify affected Japan Challenges levels and camera views; capture before/after evidence and confirm the mountains render as part of the background without obscuring puzzle pieces, Pom, or the goal. Check representative small and large puzzles and camera movement. Preserve Japan scenery, puzzle geometry and user progress. Determine the appropriate implementation without assuming an unverified cause. No fix or release is authorized by this record alone.


## BUG-005 — Rightmost floor-grid column cannot be clicked

**Reported:** 3 November 2026 by Iván. **Status:** Open; not independently reproduced. **Priority/owner:** Unassigned.

**Steps reported:** Attempt to select a square in the column at the right edge of the floor grid as Pom's movement destination. Exact level, build, device, camera and input method remain to be recorded.

**Observed:** The column on the right is not clickable.

**Expected:** Every floor-grid square should be selectable and reachable by Pom when legal movement rules allow it, including the rightmost column.

**Investigation/acceptance:** Reproduce with named levels, orientations, camera views and input methods; capture pointer/touch location and observed versus expected target. Compare right-edge squares with interior and left-edge squares and distinguish hit testing from legal reachability or a visual/layout mismatch. Verify legal movement to edge squares without allowing illegal moves or changing puzzle rules; preserve progress and other input behavior. Record device/build and evidence. No fix or release is authorized by this record alone.

## BUG-006 — Collection level names are too small on phones

**Reported:** 3 November 2026 by Iván. **Status:** Fixed locally; awaiting review.

**Observed:** On phone-width screens, Collection level names appeared smaller than level-pack names on Home.

**Expected:** Both names use the Home pack-name size, 18 px.

**Fix:** Removed the narrow-screen override that reduced Collection level titles to 0.8rem; they now retain the shared 18 px size.

## QA investigation — 30 October 2026

BUG-002 is the current priority per Iván's follow-up. BUG-001 remains queued for a visual completion run; the preliminary source findings below do not establish an on-screen reproduction.

### Shared evidence and environment

- Canonical cwd verified: `/Users/ivansantiesteban/Projects/games`. Canonical repository and project mirror are configured writable roots; both were readable. Only QA documentation/evidence was written.
- Base HEAD: `3e8f80b3750ae41c50b7eccefe01bbbfcbd1c250`; **dirty working checkout**, including game HTML, gameplay, CSS and level data. This is not an identified shipped build. No build/release was performed. Relevant source SHA-256 hashes and numerical probe output are recorded in `pom/docs/qa/2026-10-30-initial-investigation.json` (project mirror: `qa/2026-10-30-initial-investigation.json`). Hashes identify inspected contents, not a release.
- Desktop smoke inspection: existing `http://127.0.0.1:5173/`, Codex in-app browser, 1280 × 720 CSS pixels, `visualViewport.scale = 1`, title screen loaded. Bounded warning/error query returned the LittleJS DEBUG-build warning and no errors. Browser engine/version was not captured. Existing listeners included ports 5173 and 5176; neither server was changed or stopped.
- QA opened and closed its own temporary tab, did not launch a level, clear/read progress or drafts, complete a puzzle, or alter user settings. No physical iPad, installed Home Screen session, gesture replay, mobile simulation, screenshot of the failure, or recording was available/captured. This desktop smoke check is not a reproduction attempt of the touch sequence.

### BUG-002 — priority investigation

**Confirmed in inspected source:** `pom/index.html:4` declares `width=device-width,initial-scale=1,viewport-fit=cover`, with no maximum-scale/user-scalable directive. Lines 7–10 contain Apple Home Screen metadata and a manifest link. These declarations do not establish what version is installed on Iván's iPad.

`pom/src/style.css:3,26` applies `touch-action:none` to the canvas and canvas wrapper; buttons use `touch-action:manipulation` (line 2). The app uses `100dvh` and overflow clipping. Push/Pull and Start over are descendants of the canvas wrapper (`pom/index.html:20`); some control modes hide the original Push/Pull row and provide drag or stacked controls instead (`style.css:394,425`). Record the actual control mode on the affected device.

`pom/src/main.js:1206–1263` implements game-camera pinch using two tracked pointers: distance changes call `zoomBoard`, and movement calls `preventDefault`. Overlay handlers around lines 1397–1398 stop propagation; stopping propagation alone is not evidence of suppressing a browser default. A focused search of `pom/src` and `pom/index.html` found no `visualViewport`, `gesturestart`, `gesturechange` or `dblclick` handler. This identifies inspection targets, not a proven omission or cause. In particular, existing canvas touch-action means it would be premature to diagnose simply “missing touch-action.”

**Working hypotheses, unconfirmed:** native viewport magnification versus an in-game camera/layout error; a gesture crossing between canvas, controls and header; a standalone/WebKit-specific behavior; or a different installed build/control mode. None was reproduced. Do not infer a fix from the viewport meta alone or disable user zoom without considering accessibility.

**Physical-device reproduction checklist for developer/QA:**

1. Record iPad model, iPadOS version, installed URL/build, installation/update date, portrait/landscape, level ID, control mode, and whether OS accessibility Zoom is enabled. Capture the initial whole screen and whether this is Home Screen standalone or Safari.
2. In disposable progress, open the same level. Pinch outward with both fingers inside the board; then rapidly tap the same pull target. Record finger positions, tap count/spacing, piece depth and when it becomes disabled. Repeat with one finger crossing a control/header boundary; separate rapid taps without pinch and pinch without taps as controls. Frequency is currently unknown; log attempts and failures.
3. Capture before/after video including Push/Pull and Start over. With remote inspection if available, record `visualViewport.scale/width/height/offsetLeft/offsetTop`, `innerWidth/innerHeight`, canvas/control rectangles and pointerdown/up/cancel targets. A change in viewport scale would distinguish page magnification from camera-only zoom; unchanged scale requires inspecting layout/camera and possible OS magnification separately.
4. Record whether pinch inward restores controls, whether they remain tappable, and whether orientation/reopen changes the problem. Preserve progress; do not clear storage or reinstall as a troubleshooting shortcut. Compare Safari versus the pinned app on that same device/build and both orientations. A later desktop/touch simulation remains separate evidence.

**Result/limits:** No physical-device reproduction, measured failure frequency, verified recovery, root cause or fix. Exact device/build/gesture details remain missing. Next action is the physical-iPad sequence above; source findings alone cannot satisfy acceptance.

### BUG-001 — preliminary findings; visual run queued

**Confirmed source/function evidence:** Peach is `mural-peach`, catalog number 57, width 9, height 7, goal `(4,0)`, top row `....A....`: a single square at the maximum height. `victoryLandingOffset` in `pom/src/victory-effects.js:6–9` returns −0.60 or +0.80 based on approach. A direct Node import of the existing function for approach x = 3, 4 and 5 yields center x = 3.9 or 5.3 relative to the top-square interval [4,5], before depth shear/camera offsets. All three numerical centers lie outside that interval. These are function inputs, **not demonstrated legal approach routes**.

`main.js:1354–1371` applies that offset during final arrival; `startCelebration` stores it and `syncPlayer` (line 667) continues adding it to Pom's rendered pose. The showcase deliberately performs four hops, ends their vertical offset at 2320 ms, then begins its closing transition at 3200 ms (`1265–1290`). The horizontal offset persists during the settled interval and with reduced motion. The goal remains logical completion position; no puzzle-rule change was tested or requested.

**Interpretation:** Persistent sideways placement on a one-square summit is a concrete candidate for the floating appearance and differs from Iván's requested placement at the flag's spot. It does not prove the exact visible silhouette/support, reported build, route, or all affected levels. Existing `victory-arrival.test.js` asserts side clearance, not support on Peach.

**Reproduction/limits:** A complete Peach run and legal solution witness were not obtained in this initial pass; no win screen was observed or captured. The only available preview was a dirty live developer checkout, and a verified disposable gameplay-storage context was not established. Rather than risk the user's completion records, no level was launched. Visual reproduction is queued after BUG-002. Preserve original reported steps above; expected support and flag replacement/transition still need developer design work. No fix, commit, push or release was made.


### BUG-002 — follow-up browser check, 30 October 2026

Iván additionally reports that **pinching inward does not restore access to the controls**. This is user-reported recovery failure, not independently reproduced.

QA opened `http://localhost:5173/` in the in-app desktop browser at 1024 × 768, selected Lesson 8, and double-clicked its enabled stacked “Pull Y piece” button once. The pull changed the board; afterward `visualViewport.scale` remained 1. Start over was within x=925.29–1012, y=84–124; active Push/Pull were within x=337–687, y=662–702 and 708–748. All were inside the viewport. A screenshot was inspected in the QA chat. **Rapid mouse double-click alone did not reproduce whole-app zoom.** This is neither touch emulation nor a pinch test. The documented browser automation surface exposes viewport resizing but no multi-touch/pinch input; the earlier statement that touch emulation was available was too broad. Full pinch-then-tap reproduction remains outstanding and does not inherently require physical hardware if a suitable browser touch-emulation interface is available.

The localhost origin already showed existing completion records, so it was not disposable despite being a different hostname. No completion, reset, settings change, storage clearing or draft edit was performed; only the current in-memory board was manipulated. The temporary viewport override was reset and the QA-created tab closed. Existing servers and application source were untouched.


### BUG-002 — developer follow-up: accessibility Zoom lead

Iván reports that accessibility Zoom may be involved. This is a hypothesis, not a confirmed setting or reproduction. The new recovery detail (ordinary inward pinch does not restore access) is consistent with that possibility, but does not distinguish it conclusively from a captured browser gesture.

Apple documents iPad accessibility Zoom as system-level magnification controlled by a three-finger double-tap (or an Accessibility Shortcut), with three-finger dragging for panning. It differs from the app camera's two-pointer pinch and browser visual-viewport zoom. Reference: https://support.apple.com/guide/ipad/ipad9a245e3e/ipados and https://support.apple.com/109058 . User has been asked whether three-finger double-tap restores the view and whether Settings → Accessibility → Zoom is enabled. No accessibility settings were changed.

Source review confirms camera zoom changes only the render camera; it cannot directly scale the HTML header or action buttons. Browser-scale handling and system magnification must therefore be investigated separately when those controls themselves enlarge. Existing touch-action:none on the board also means a simple missing-touch-action diagnosis is not established. Browser Developer Tools can investigate native browser magnification and touch boundaries, but cannot establish or reproduce the iPad OS accessibility compositor's behavior.

No runtime patch, global zoom restriction, maximum-scale directive or new deployment has been introduced. In particular, do not disable accessibility zoom as a speculative fix. Await the user-assisted setting/recovery check while keeping browser/camera/layout hypotheses open. No physical iPad confirmation.


### BUG-002 — trial fix ready for tester validation

Developer implemented a precautionary web-zoom fix under Iván's instruction to try the best-supported hypothesis even without reproducing the reported device failure. It is not a confirmed root-cause fix, and does not alter or disable iPad OS Accessibility Zoom.

- Safari legacy gesturestart/change/end and double-click zoom defaults are canceled only inside the game playfield while the page is at normal browser magnification. Normal clicks/pulls still execute. No maximum-scale or user-scalable restriction is added.
- When VisualViewport reports browser magnification, the app follows its visible width/height and pan offsets, leaving the UI magnified rather than inversely scaling text. This keeps the action layout in the visible area.
- Native page pan/pinch recovery remains available while magnified; board camera drags do not consume it. Optional arrow controls also permit native pinch in this state. Header/menu/browser accessibility zoom is not globally canceled.
- Six viewport tests cover normal layout, scaled/offset/rotated viewport dimensions, scoped gesture defaults, normal clicks, native recovery, unsupported APIs and listener cleanup. Together with prior save/entry-route regressions, the suite has 97 passing tests; game and restricted-player builds pass.
- A temporary browser fixture used the actual app CSS/header/action layout and an injected *test-only* VisualViewport provider. At 1x, 2x, 3x and panned 3x, measured Undo, Start over, Push and Pull rectangles were all inside the modeled visible viewport. This is simulated geometry, not native pinch or physical iPad/accessibility Zoom reproduction. The fixture is removed from source and is not published. Results: /private/tmp/bug-002-simulated-viewport-results.json.
- Chrome Guest Developer Tools were opened for touch simulation, but a reliable native pinch sequence was not completed with the available UI controls; do not claim a successful touch emulation or reproduction.

Iván has authorized a new build and GitHub push for tester review. Validation on the original installed iPad remains pending. Repeat the original pinch-out/rapid-pull sequence; confirm controls remain accessible and inward pinch recovery works. If it persists, record the installed build and whether Accessibility → Zoom is enabled and three-finger double-tap restores the view. No progress, puzzle drafts or accessibility settings were reset.


### BUG-002 — trial deployment

30 October 2026: Iván explicitly authorized the build/push. Trial fix published as commit d975270b120f56f7a8a7b67bf9dbd36c4d312c04, Build 37; GitHub deployment run 41090944128 completed successfully. The release includes 97 passing tests and both builds. Internal bug documentation and temporary viewport fixture were excluded. Status remains awaiting tester validation; native iPad pinch/accessibility Zoom failure has not been reproduced or proven resolved.
