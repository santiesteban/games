# Little Ledges

Camera experiment: open `/?camera-lab=1` while running the game locally. See [camera and scenery study](docs/CAMERA_STUDY.md) for the two environment treatments and comparison controls.

Little Ledges is a LittleJS remake of the original Little Ledges puzzle. The board, pullable block pieces, mascot, flag, and lighting are rendered with LittleJS's native 3D renderer. The interface and meadow artwork follow the original game.

## Run locally

```sh
npm ci
npm run dev
```

## Controls

- Click an exposed block face to select the connected piece.
- Click a reachable ledge to move Pom.
- Use **Pull out** and **Push in** while Pom is beside a piece.
- **Undo** or `Z` reverses the last move; **Start over** or `R` resets the puzzle.
- Rotate the camera with the view buttons or the arrow keys.

The current game lives directly in `pom/`. The Pages workflow publishes it at `/games/pom/`. The original meadow and sky files are kept beside the app source.

## Level data

`src/data/levels.json` uses the versioned Little Ledges catalog, with stable IDs,
per-level RGB palettes, explicit geometry, categories, and source/object metadata.
See [the level-format guide](docs/LEVEL_FORMAT.md) and
[JSON Schema](docs/levels.schema.json) before adding levels. The Murals group is
displayed after More Challenges, with 18 reconstructions in their original colors;
see [Murals references and numbering](docs/MURALS.md).
Japan Challenges follows Murals and precedes Others, with 16 grounded Pushmo QR
conversions in Japan Spring scenery; see [sources and ordering](docs/JAPAN_CHALLENGES.md).

## Distribution and companion website

See [web and installed-app architecture](docs/distribution.md). The web game, public creator and restricted player remain hosted together on GitHub Pages during development. The restricted player uses `npm run build:playtest` and excludes the built-in catalog. Native packaging can reuse the normal game build through the versioned platform adapter; Electron/Capacitor shells and store submissions are not included yet.

## Archived versions

| Version | Source | Pages path |
| --- | --- | --- |
| v0.01 (formerly v1) | `pom/v0.01` | `/games/pom/v0.01/` |
| v0.02 (formerly v2) | `pom/v0.02` | `/games/pom/v0.02/` |
| v0.03 (formerly v3) | `pom/v0.03` | `/games/pom/v0.03/` |

The previous `/pom/v1/`, `/pom/v2/` and `/pom/v3/` addresses redirect to their current archive locations while retaining query strings and puzzle fragments. `/pom/v4/` serves the current game through a compatibility entry with shared assets, without redirecting existing Home Screen shortcuts out of their saved app scope. The historical `little-ledges:v4:*` storage keys remain unchanged to preserve progress and settings.
