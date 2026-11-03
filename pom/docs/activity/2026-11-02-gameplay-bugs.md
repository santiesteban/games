# BUG-003 and BUG-001 — local verification, 2 November 2026

Base: 65ef09f on codex/saturn-performance. This follow-up is an uncommitted local diff, not pushed or deployed. The existing performance commit remains intact. No saved formats, rules, authored puzzle geometry or permanent IDs changed.

## BUG-003: hidden levels counted — fixed locally

Iván clarified that the incorrect denominators include hidden levels. The prior checks compared counts to full catalog membership; they were insufficient because the Collection grid filters by availability while progress totals did not. The first three packs display 10, 9 and 14 objective levels with the default Hide levels with known issues setting, but their denominators previously remained 18. This is now reproduced directly from the differing predicates.

The fix applies the existing availability predicate to both the completed count and total. Home and Collection share this calculation. Studio tools remain excluded from completion objectives. Saved completions are preserved; hidden completions count again when their levels become visible. Incompatible levels remain excluded by the existing availability rules.

Three added regression tests cover actual default visible catalog totals [10,9,14,18,16,2], hidden/unsupported completed IDs, visibility changes without modifying completions, empty/fully hidden packs and excluded studios. Production-browser verification toggles Hide levels with known issues on/off/on, comparing Home counts, Collection counts and actual visible grid entries on phone/desktop layouts; saved completion strings must remain unchanged. Evidence: pack-visibility.json and pack-visibility.cjs. Earlier pack-regression files are historical full-membership checks and do not validate the corrected requirement.

Files: src/catalog-screens.js, src/catalog-screens.test.js.

## BUG-001: reproduced and fixed locally

A bounded search produced a 20-action legal solution to Peach (mural-peach, Level 57). The solution was verified by shared replaySolution, then replayed through actual movement/manipulation handlers in a disposable browser. Final piece depths: [1,2,3,0,0]; logical player position: {x:4,y:0,z:0}.

Before: at 2.45 seconds into the victory presentation, the summit spans x=[4,5] but Pom's rendered center is x=5.3 because of the persistent +0.8 victory offset. The screenshot visibly shows Pom beside and outside the single-square summit.

After: remove the sideways victory displacement and its arrival component. Hide the collected flag/badge and its shadow on completion; Pom occupies its centered spot at x=4.5. Existing arrival hop, four victory hops, framing and transition timing remain. Flag visibility returns normally on replay.

Files: src/main.js, src/victory-effects.js, src/victory-arrival.test.js. Regression tests cover centered support over a one-square summit and representative edge/depth goals, continuous arrival/landing, and reduced motion.

## Verification

- 113/113 tests passed.
- Full game and restricted-player builds passed.
- Legal Peach replay with normal desktop motion and a phone-sized reduced-motion layout passed: centered settled pose, collected flag hidden, completion mark in Collection, new completion persisted without losing seeded progress, replay restored initial depths and visible flag, no page errors.
- Before/after screenshots inspected; Pom is visibly supported by Peach's summit after the fix.
- Visibility-aware pack tests cover both layouts and preference toggles; rebuilt production preview evidence is recorded in pack-visibility.json.
- Git whitespace check passed. No user storage or drafts were cleared. Browser sessions were disposable.

Limits: no physical iPad/Safari testing; not every catalog goal or side camera was visually walked through. The victory change is shared by the full and restricted players; the restricted-player build passed, but its parent/iframe result flow was not replayed end to end in this task.

## Local review and evidence

The rebuilt preview is http://127.0.0.1:5183/ . Reload it to test Level 57 — Peach. This preview also includes the previous performance fix. No publication was performed.

Evidence folder: /Users/ivansantiesteban/Documents/ChatGPT/Little Ledges Game/bug-fixes/2026-11-02/

peach-witness.json records the legal solution. checks-before.json and peach-before.png capture the failure. checks-after-final.json / peach-after-final.png capture the fixed desktop win and replay. checks-after-phone-reduced.json / peach-after-phone-reduced.png cover the phone layout and reduced motion. pack-regression.json and pack-regression-production.json record pack totals. Reusable diagnostic scripts are saved beside them; they use the existing local Playwright installation and isolated test contexts.

## Pencil content adjustment — 2 November 2026

At Iván’s request, Level 70 (mural-pencil) now has a separate neutral grey [128,128,128] single-cell piece at grid (2,0), the outlined upper-left flag cell in his screenshot. The remaining three black tip cells stay connected. Added palette slot I and changed only the first row from ..AA.. to ..IA... Level ID, number, flag, start, occupied silhouette and all other levels remain unchanged. No authored initialDepths are present to migrate. Existing saved completions are retained by stable level ID; transient piece discovery indices change with the topology, as expected.

Catalog validation passed; connected-piece count is now 14. A canonical-rule check verified the grey cell can move independently while the black piece depth stays fixed. All 113 tests and the full game build passed. Full Pencil solvability was not established. Local preview updated; no push/publication. Screenshot: pencil-grey-piece.png in the same evidence folder.

## Known-issue flags — 2 November 2026

At Iván’s request, Levels 60 Crab (mural-crab), 69 Snail (mural-snail) and 71 Pig (mural-pig) are now marked knownIssues:true. The existing Hide levels with known issues toggle excludes them, and turning it off restores them with their issue labels. Murals now has 15 visible objectives under the default filter and 18 when shown. Level IDs and saved completions remain intact. The visible-total regression expectation was updated. All 113 tests and the full game build passed. Local preview updated; no new push/publication.
