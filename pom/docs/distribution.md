# Little Ledges: web development and installed-app distribution

## Project boundaries

Keep one repository and independently built applications:

| Component | Source | Output | GitHub Pages path |
| --- | --- | --- | --- |
| Full game | `pom` | `pom/dist` | `/games/pom/` |
| Public Puzzle Creator | `pom/creator` | `pom/creator/dist` | `/games/pom/creator/` |
| Restricted playtest player | `pom`, playtest mode | `pom/dist-playtest` | `/games/pom/playtest/` |
| Original game archive | `pom/v0.01` | Static files | `/games/pom/v0.01/` |
| Three.js archive | `pom/v0.02` | `pom/v0.02/dist` | `/games/pom/v0.02/` |
| Earlier LittleJS archive | `pom/v0.03` | `pom/v0.03/dist` | `/games/pom/v0.03/` |
| Shared code | `pom/shared` | Bundled into each app | No separate service |

The Pages workflow uses `configure-pages`' actual `base_url`, builds the current game, creator, player and archives, and publishes them in one artifact. `node pom/scripts/stage-site.mjs` prepares the same `_site/` tree locally after the builds. All outputs use relative asset paths, so project-site prefixes work. The full game remains publicly playable on Pages during development. The creator's Playtest action uses only the separate player.

The player uses the same renderer, animation, camera and movement implementation as the full game. Vite resolves `#level-catalog` to `playtest-catalog.js` for this build: only the decoded submitted puzzle exists in its catalog. The full-game catalog JSON is not in its dependency graph. Home, settings, level library, imports and progress saves are unavailable during playtest. A missing/corrupt payload shows an error and a return link rather than opening a built-in level. Legacy full-game `#playtest` links redirect to this player before the game renderer loads.

The player still shares renderer UI scaffolding, appearance defaults and scenery assets. It is a restricted experience, not a licensing/DRM system. The full web game is deliberately available separately during development.

## Local development

Install dependencies in `pom` and `pom/creator` with `npm ci`.

1. In `pom`, run `npm run dev -- --host 127.0.0.1 --port 5173`.
2. In `pom/creator`, run `npm run dev`.

The second command launches both the creator at port **5174** and its playtest player at port **5175**, with live reload. Stopping it stops both child processes. Ports are strict to avoid silently pointing at the wrong app. Use the same hostname (`localhost` or `127.0.0.1`) consistently; those are different browser storage origins. If running an older creator process, restart it to pick up the combined launcher. The player can also be started alone with `npm run dev:playtest` in `pom`.

Build independently:

```sh
npm --prefix pom run build
npm --prefix pom run build:playtest
npm --prefix pom/creator run build
```

`npm --prefix pom run preview:playtest` serves the built player. No backend or database server is required.

## Deployment addresses

`pom/shared/deployment.js` owns addresses for both applications and the player. Defaults preserve the local ports and the Pages paths above. Build variables are optional (examples beside each app):

| Variable | Purpose |
| --- | --- |
| `VITE_PUBLIC_SITE_URL` | Public site root, e.g. `https://santiesteban.github.io/games/`; supplied automatically by Pages CI |
| `VITE_GAME_URL` | Full web game, including its trailing slash |
| `VITE_CREATOR_URL` | Public creator, including its trailing slash |
| `VITE_PLAYTEST_URL` | Dedicated web player, including its trailing slash |
| `VITE_SHARE_GAME_URL` | Stable public HTTPS import URL encoded in QR cards |

Unset localhost QR sharing uses the existing deployed game URL, so cards do not contain a developer's localhost address. Set `VITE_SHARE_GAME_URL` explicitly when reviewing another deployment. Native builds must use explicit public addresses or the public site root, because local app/file URLs cannot be shared. Do not put secrets in `VITE_*` values.

Keep import URLs stable across releases. Existing `#puzzle=<payload>` cards continue to work. The game also accepts `?puzzle=<payload>` at the same game URL for future app-link routing without changing the puzzle codec. Query links expose the payload to normal request logging; fragment links remain the sharing default. Neither link auto-saves: every imported puzzle goes through the preview and explicit Add action.

## Storage and transfers

- Full game: existing IndexedDB `little-ledges-puzzles`, store `puzzles`; existing progress/settings keys are retained.
- Creator: IndexedDB `little-ledges-creator`, stores `drafts` and `metadata`.
- Existing creator drafts are copied once, atomically, from the legacy shared database. The legacy copies are kept for rollback. The current draft pointer remains unchanged.
- The game storage API exposes only puzzles; the creator storage API exposes only drafts. This is a code boundary, not a browser-origin security boundary. Apps on the same Pages origin must not be treated as mutually untrusted sandboxes.
- Creator drafts, browser game saves and installed-game saves are separate. JSON export/import is the lossless transfer and backup format. BroadcastChannel sync applies only to game tabs on the same origin/profile. No account, cross-device sync or website-to-native database access is implied.

Installed wrappers should serve packaged game assets using one stable app origin and a persistent app data directory. Changing the origin/profile can make existing IndexedDB and localStorage saves inaccessible; plan migrations before changing it. Fonts and their OFL licenses are now bundled with each build, so no Google Fonts connection is required. Built-in game assets are bundled; opening the public creator still needs internet. A normal website build is not an offline PWA installation.

## Future native shells

Electron is the desktop target (Windows/macOS/Linux). Android/iOS need a mobile shell such as Capacitor. Both should package the **full game's `dist`**, not load the public game website as executable app code. The public creator opens in the system browser and never receives native privileges.

No Electron or Capacitor project, store identity, signing credentials or store submission has been created by this change. Those are a separate packaging step. The renderer is prepared through `pom/shared/platform.js` and the import consumer in `my-puzzles.js`.

A trusted installed shell can provide this versioned interface as `window.littleLedgesPlatform` before the game entry runs:

```ts
interface LittleLedgesPlatformV1 {
  version: 1;
  openExternal(url: string): Promise<void>;
  saveFile(file: {
    name: string;
    type: string;
    bytes: Uint8Array;
  }): Promise<void>;
  pickPuzzleFile(): Promise<string | null>; // JSON text; null means canceled
  getLaunchImport(): Promise<PuzzleTransfer | null>;
  onPuzzleImport(listener: (value: PuzzleTransfer) => void): () => void;
}
type PuzzleTransfer =
  | { kind: 'json'; text: string }
  | { kind: 'url'; url: string };
```

Web builds work without this bridge: file inputs and downloads use browser APIs, links open normal tabs. Native incoming files/links use the exact same size/version/checksum validation and explicit import preview as browser imports. Allowed URL origins and paths come from deployment configuration; arbitrary URL fetching and arbitrary filesystem paths are not supported. Do not duplicate a launch import as a live event; queue OS events until a listener is attached. Native delivery starts after the game is ready.

For Electron, implement this through a narrowly scoped preload/contextBridge and validated IPC. Keep Node integration off, context isolation and sandboxing on, and reject unknown messages, file types, sizes and external URL schemes in the main process too. Reject unexpected navigation/window creation; never grant the bridge to remote creator content. Capacitor can install the equivalent adapter using its native plugins. The renderer adapter alone is not the native security boundary.

At packaging time, configure store IDs, persistent storage, signed releases, OS file handling, and verified HTTPS app links. The HTTPS web game remains the fallback during development. Once final app IDs/domains are known, publish Android/iOS association files and provide the OS link/file events to this bridge. Do not add placeholder association files or claim a link opens an installed app before that registration exists. In-game camera scanning is still deferred; when added, send decoded HTTPS puzzle links through the same import validator.

## Versioning

The current game has no version directory: source `pom/`, public URL `/games/pom/`. The former v1 and v2 sources and public paths are now `pom/v0.01` and `pom/v0.02`. The former v3 archive is now `pom/v0.03`, served at `/games/pom/v0.03/`. Pages generates redirects for `/pom/v1/`, `/pom/v2/` and `/pom/v3/`, preserving both query parameters and fragments. Installed import handling also recognizes the former `/pom/v4/` route on configured game origins.

### Home Screen shortcuts

The full game declares a web app manifest with `display: standalone`, explicit root scope/start URL, PNG icons and iOS standalone metadata. Its identity defaults to that root start URL. These files are served from `/pom/` and are prefix-safe for Pages project sites. This does not add a service worker or offline caching.

Pages serves the current built HTML at `/pom/v4/` with a base URL pointing to the root game assets. It deliberately does not navigate to `/pom/`: an existing iOS Home Screen clip may retain `/pom/v4/` as its app scope, and navigating to its parent can open Safari View Controller with browser controls. The compatibility page uses the same JavaScript, styles, manifest and origin storage as the root entry. No versioned source app is reintroduced. Normal menu/level navigation stays within the page; old puzzle links still open their import preview.

Scope behavior is documented in [Apple’s web apps presentation](https://developer.apple.com/videos/play/wwdc2023/10120/) and standalone metadata in [Safari Web Content Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html). Browser reviews can confirm the compatibility URL stays unchanged and its assets load. Actual Home Screen chrome behavior still needs a physical iPhone check; do not equate a desktop narrow viewport with an installed web app.

Progress, preferences, designer drafts and control flags keep their historical `little-ledges:v4:*` keys. IndexedDB names and formats stay the same. Moving the URL within the same Pages origin does not require copying or clearing saves.


`pom/shared` contains the canonical format, codec, validation, connectivity, movement and push/pull rules, independent of rendering and native APIs. Existing game module paths re-export shared rules for compatibility with current tools. Website and app releases need not ship together, so keep schema, rules and codec versions explicit. Current exports remain schema 1 / rules 1 / codec 1. Unsupported versions are rejected with an update/compatible-export message. Future mechanic changes need explicit version support or migrations; never silently reinterpret a puzzle produced for different rules.

## Remaining release work

Before store release: implement native shells/bridge and OS associations; exercise real file handoff, link launch, export and persistent saves on each platform; verify touch input and rendering on physical devices; configure signing and store pipelines. No cloud service is required for the current self-contained JSON/QR approach.
