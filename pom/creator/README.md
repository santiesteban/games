# Little Ledges Puzzle Maker

A separate, browser-local companion website for making 32 × 32 puzzles. Uses the game’s branding, level validator, movement routes, and shared push/pull rules.

## Run locally

1. In `pom`, run `npm ci` and `npm run dev -- --host 127.0.0.1 --port 5173`.
2. In `pom/creator`, run `npm ci` and `npm run dev`.
3. Open <http://localhost:5174/>.

The creator command also starts its isolated player at port 5175. Each website builds independently with `npm run build`; build the player with `npm --prefix pom run build:playtest` from the repository root. Pages publishes `/pom/creator/`, `/pom/` and `/pom/playtest/`. See [distribution architecture](../docs/distribution.md) for web development, native-app boundaries and deployment configuration.

Optional build variables (see `.env.example`):

- `VITE_PUBLIC_SITE_URL`: deployed site root; Pages CI supplies its actual base URL.
- `VITE_GAME_URL`: full web game, default port 5173 locally or `/pom/` on Pages.
- `VITE_CREATOR_URL`: public creator, default port 5174 locally or `/pom/creator/` on Pages.
- `VITE_PLAYTEST_URL`: isolated player, default port 5175 locally or `/pom/playtest/` on Pages.
- `VITE_SHARE_GAME_URL`: stable game import address encoded in QR cards. Local development defaults to `https://santiesteban.github.io/games/pom/`. Publish the matching game changes before sharing QR cards.

## Editor

The creator uses a restrained cream interface with lighter headings and flat controls. New drafts show an editable Puzzle title field with the placeholder “Title of your puzzle.” JSON and QR exports require a title; an inline alert focuses the field when it is missing or still uses the legacy default. Playtest the puzzle appears beside solvability controls in Can Pom reach it?

- Fixed 32 × 32 canvas, plus a separate green floor row for placing Pom.
- Pencil (B), eraser (E), fill (F), eyedropper (I), piece select (V), pan (H), flag (G), Pom (P).
- Normal wheel/trackpad gestures scroll the page, including over the canvas. Pan tool enables bounded canvas panning; Ctrl/Command + wheel zooms; Fit resets the view.
- On touch screens, swipes scroll and taps paint by default. Enable Touch drawing for continuous strokes, or select Pan for canvas gestures and pinch zoom. Turn Touch drawing off or leave Pan to resume page scrolling.
- Arrow keys focus a cell; Space or Enter uses the selected tool. Ctrl/Command Z and Shift Z undo/redo.
- Identical RGB colors are merged into one palette slot. Orthogonally touching cells of one palette slot form a piece; diagonal contact does not. Up to ten palette slots.
- Select a piece to set its initial pull depth. Place Pom on exposed tops or the floor; Canvas & pieces also allows choosing his starting depth.
- Image placement is saved with drafts and used identically for the canvas reference and pixel conversion. Older cropped drafts retain their appearance.
- Image processing stays local: aspect-preserving reference size (10–800%), free positioning, direct image dragging, reference opacity, transparent-cell preservation, nearest-palette conversion with no dithering. Reference uploads are limited to 20 MB / 80 megapixels and downsampled to a maximum dimension of 2048 for local drafts.
- Move the drawing to the floor or center it. Undo history is kept in memory; drafts and their reference images are saved in IndexedDB on that browser origin.

## Start from a level

Choose **Start from a level → Open QR or JSON** at the top of the settings panel. The importer accepts:

- Little Ledges puzzle JSON, preserving its palette, flag, Pom start and initial pull depths.
- A Little Ledges QR image, including a complete exported puzzle card, or a pasted sharing link with `#puzzle=` / `?puzzle=`.
- Original Pushmo / Pullblox QR images, decoded from their binary payload without converting it to text first.
- The decoder companion's `PUSHMOJSON1:` QR images and decoded Pushmo JSON, using the same conversion rules.

The preview identifies the source, shows the puzzle and flag, and lists conversion warnings before **Create draft**. Importing saves the current draft and creates a fresh editable copy with a new puzzle ID. It does not overwrite the source puzzle or an existing draft, and it clears source reference images and cached analysis. A storage failure blocks replacement of an unsaved current draft.

Files are processed locally; sharing links are decoded without navigating to or fetching their URLs. JSON is limited to 64 KB. QR images accept PNG, JPEG, WebP, AVIF, GIF and BMP, up to 20 MB / 80 megapixels, with a maximum scanning dimension of 3072 pixels. Scanning runs in a dedicated worker with a 20-second limit and is cancelled when the dialog closes or another input is selected. There is no camera permission or upload service involved.

Pushmo conversion preserves the 32 × 32 grid, exact indexed RGB colors and original flag. Every piece starts fully pushed in and Pom starts on the ground. It does not align floating art automatically; the preview warns when the drawing does not reach the floor, and Setup → Align to floor remains available afterward. Solvability is unverified until checked against Little Ledges' rules.

Stages with switches, manholes, invalid source checksums, missing/invalid goals, or duplicate RGB values in used color slots are rejected rather than silently changing their mechanics. Unknown formats, damaged Little Ledges payloads and unrelated QR codes show an inline error and leave the current draft intact.

The imported Pushmo reader/converter is independently written MIT-licensed code from the decoder companion. jsQR 1.4.0 handles QR scanning in the worker; its distribution wrapper is adapted to ES modules. Required notices ship at `import-licenses.txt`; component provenance is in `src/import/vendor/NOTICE.md`. No earlier third-party parser implementation or sample artwork is bundled.

## Playtest isolation

Playtest opens a separately built player in an iframe using `#playtest=<payload>`. It shares the real game renderer and rules but does not bundle the built-in level catalog. It locks this session to that puzzle, hides the home screen, settings and level library, and blocks normal level/menu navigation. The back arrow returns to the editor. Victory offers Play again and Back to editor. Reload preserves playtest mode. No library imports or progress writes occur in this mode.

The parent accepts a close message only from the configured playtest origin and its own iframe window. The game posts the close request to its referrer’s origin. A directly opened playtest returns to the companion website.

## Sharing and My Puzzles

JSON is canonical and lossless. PNG cards crop the preview to the painted bounds, keep internal empty cells, and adapt their height to the artwork. They include a self-contained import URL in a QR code (M error correction, integer modules, four-module white margin). Keep the QR legible when resizing; share the original PNG when possible. The game also accepts the same payload in a `?puzzle=` query for future OS app-link handling. Installed apps can deliver links/files through the platform adapter; native OS registration remains a packaging step. The game’s integrated camera scanner is deferred; ordinary phone cameras can follow these links once the game changes are published.

In Little Ledges, My Puzzles appears after all the built-in groups. Import previews require an explicit Add action. Unchanged IDs open/update the saved entry without clearing completion; changed layouts replace it or can be saved as a copy. Completion is separate from built-in progress. One Manage puzzles button contains per-puzzle Export JSON and Delete actions. Deletion includes a ten-second Undo. Other game tabs receive updates through BroadcastChannel.

## Puzzle contract

`../shared/puzzle.js` owns validation, canonical palette indexing, revision checks and the QR codec. A standalone JSON contains:

- `format: "little-ledges-puzzle"`, `schemaVersion: 1`, `rulesVersion: 1`
- `id`: stable 1–64 character ASCII identifier (letters, numbers and hyphens)
- `name`: nonempty UTF-8 title, at most 128 bytes
- `grid`: exactly 32 strings of 32 cells; `.` is empty
- `palette`: 1–10 single-character slots mapped to RGB bytes; normalized to `0`–`9`
- `goal: { x, y }`: an occupied cell
- `start: { x, y, z }`: a valid exposed walking position; y=32 is the floor
- `initialDepths`: one integer 0–3 per row-major connected piece
- `revision`: FNV-1a integrity hash of rules and gameplay content (not an authentication signature)

Imports are restricted to puzzle geometry and colors. They cannot enable studio modes, inject markup, load remote assets, or supply unsupported mechanisms. JSON is limited to 64 KB. Unknown format/rules versions and damaged QR payloads are rejected. QR payloads pack cells at four bits and depths at two bits, with version, bounded metadata and checksum. Source images, history and analysis claims are never shared.

## Solvability

The shared movement and level-format implementations live in `pom/shared`; existing game import paths remain compatible re-exports. The worker explores directed walking and legal push/pull transitions using the real game rules. It records an action witness and replays it before reporting Solvable. Exhausting all reachable states reports no solution. A time, memory/state limit or cancellation reports Not determined; it never claims impossibility on a timeout.

Limits: 15 seconds, at most 18,000 states, reduced for highly fragmented puzzles to bound the depth-vector memory; the UI has an additional worker watchdog. Complex 32 × 32 murals can remain undetermined. Manual playtesting and export remain available. Diagnostics point to the unreachable flag and explored search, not an invented uniquely incorrect cell. Successful analysis can be watched on the editor canvas and is cached with the saved draft’s gameplay revision.

Browser storage is device/origin specific and may be cleared by the browser. JSON exports are the backup and transfer format. No server, accounts, public gallery, or cross-device sync is included.

Creator drafts now use a separate `little-ledges-creator` IndexedDB database. Legacy drafts are copied once without deleting the originals. Game saves remain in their existing database. Fonts are bundled locally with their OFL licenses.
