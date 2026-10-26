# Implementation review — 2026-10-25

## Checked

- Separate creator and game production builds succeed; no whitespace errors.
- JSON parse/validation/round trip, canonical palette normalization, damaged checksums, unsupported versions, invalid geometry/start/goal, byte bounds and distinct palette enforcement.
- Maximum fragmentation: 1,024 pieces, ten colors, longest supported UTF-8 title and ID. Compact fragment: 1,486 characters; deployed game URL: 1,538. Worst-case QR successfully decoded.
- Actual browser-exported PNG (1,400 × 2,068) decoded back into the same puzzle. Also decoded after reducing to 700 pixels wide.
- Extracted interaction eligibility/safety agrees with the previous implementation in 75,414 comparisons across the existing catalog and representative depths 0–3.
- Worker finds and independently replays a legal solution. A floating, inaccessible example exhausts all 132 reachable positions and reports no solution.
- Browser editing from blank: keyboard painting, flag placement, structural feedback, analysis and solution playback.
- Transparent reference PNG upload, crop/opacity controls, palette conversion and flag placement. Restored the painted drawing, title and reference after reloading. Saved solution witness also restores for the matching revision.
- Import preview → explicit Add → game play; local library survives reload; normal custom-puzzle completion returns to its checked card in My Puzzles; deletion and Undo restore the saved puzzle.
- Custom-puzzle framing uses painted bounds and the authored start, rather than unused 32 × 32 padding. Gameplay coordinates remain unchanged.
- Restricted playtest enters only the current puzzle. No level browser, home screen, settings or Add action. Manual completion shows only Play again and Back to editor; replay restarts the same puzzle. Playtest URL retains its mode on reload. Temporary playtests do not write completion or library records.

## Limits

- Solvability search is budgeted; large or fragmented puzzles may be Not determined. Export and manual playtest remain available.
- Camera scanning inside the game is deferred. QR cards open an import URL through a normal camera/browser after deployment.
- Storage is local to each browser origin. Source images and analysis stay in drafts; JSON is the portable backup.
- Responsive layout and touch gestures are implemented. A physical-phone gesture/performance pass is still useful before a public release, especially for densely fragmented 32 × 32 puzzles.
- This change is local; publication requires pushing the matching game and companion builds through the Pages workflow.

## Distribution preparation — October 25, 2026

- Game, creator and isolated-player production builds pass after the shared-core refactor; whitespace checks pass.
- The production full-game bundle contains `builtin-001`; the isolated-player output does not. The playtest catalog module has no built-in catalog dependency.
- Reviewed the existing saved user puzzle in the new player at `localhost:5175` inside the creator. The submitted layout renders; the visible controls provide only that puzzle, its manipulation/view controls and Back to editor. Closing the preview restores the creator.
- Reviewed the single Manage puzzles button and its Export JSON/Delete dialog. Cards have no per-card edit controls and use tighter title line spacing. Existing saved game puzzles and the current creator draft remain visible after the storage split.
- Pages workflow stages game, creator and player separately using the configured Pages base URL. It has not been published by this turn.
- Native bridge and OS link/file handling still require real Electron/Capacitor shells and device review. No native/store build or physical-device test was performed.
