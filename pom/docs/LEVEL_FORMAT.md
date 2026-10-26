# Little Ledges level format — version 1

The game reads `src/data/levels.json` through `loadLevelCatalog` in
`src/level-format.js`. `docs/levels.schema.json` describes the JSON structure;
the loader also checks references, dimensions, duplicate identities, starting
positions, and engine compatibility. A valid document is not proof of solvability.

## Catalog

```json
{
  "format": "little-ledges",
  "schemaVersion": 1,
  "groups": [
    { "id": "murals", "name": "Murals" }
  ],
  "levels": [
    {
      "id": "mural-staircase",
      "number": 57,
      "group": "murals",
      "name": "Example staircase",
      "description": "An example of the native format.",
      "kind": "puzzle",
      "knownIssues": false,
      "difficulty": 1,
      "coordinateOrigin": "top-left",
      "emptyCell": ".",
      "width": 3,
      "height": 3,
      "palette": {
        "A": [242, 160, 90],
        "B": [121, 166, 110]
      },
      "grid": ["AAB", "ABB", "BBB"],
      "start": { "x": 0, "y": 3, "z": 0 },
      "goal": { "x": 2, "y": 0 },
      "objects": { "switches": [], "manholes": [] }
    }
  ]
}
```

Group order controls gallery and next-level order. Within a group, levels sort
by `number`. Empty groups are not rendered. The built-in catalog reserves
`murals` immediately after `more-challenges`, followed by `japan-challenges` and `others`.
`rangeLabel` optionally replaces the automatically generated number range.

The 18 reconstructed Murals occupy display numbers 55–72. Japan Challenges follows
with 16 QR conversions (73–88), using Japan Spring scenery. Others follows
with Movement Studio (89), Pull out a path (90), Design Playground (91), and Background Studio (92). The first two retain the original
`builtin-055` and `builtin-056` values. See [Murals provenance](MURALS.md) and [Japan Challenges](JAPAN_CHALLENGES.md).

## Identity and metadata

| Field | Meaning |
| --- | --- |
| `id` | Permanent unique string. Letters, digits, `.`, `_`, `:`, and `-` are allowed. Starts with a letter or digit. Use an ID independent of the display number. |
| `number` | Unique positive display number. Changing this does not change progress identity. |
| `legacyId` | Optional unique former numeric ID. Used only to read existing completion saves and identify legacy Studio references. Preserve it when renumbering a built-in level. |
| `group` | ID of a declared catalog group. |
| `name` | Nonempty display title. |
| `description` | Optional explanatory text. |
| `kind` | `puzzle` (default), `movement-studio`, `design-playground`, or `background-studio`. The design/background studios are non-completable scenes with controls scoped to that scene. |
| `environment` | Optional scenery ID from `src/environments.js`. Overrides the group's optional `environment`; defaults to Meadow. See [Background Studio](BACKGROUND_STUDIO.md). |
| `knownIssues` | Boolean, default false. Used by the existing hide-known-issues setting. |
| `difficulty` | Optional byte, 0–255, or null. Values outside the decoder's observed 1–5 range are preserved. Currently not displayed. |
| `warnings` | Optional array of source observations. These are not proof of incompatibility. |
| `source` | Optional provenance object; see below. |

Do not derive a progress ID from array position, title, display number, or source
timestamp. `builtin-001` through `builtin-056` are the permanent IDs of the existing
levels. Existing numeric completion saves map through `legacyId`; new completion
writes use the permanent strings and the same local-storage key.

## Geometry and palette

- `coordinateOrigin` is `top-left`; `emptyCell` is `.`.
- `width` and `height` are integers 1–32. `grid` contains exactly `height` strings
  of exactly `width` characters. Grid access is `grid[y][x]`.
- Each occupied character is a **slot ID**, not a named pigment, piece ID, or depth.
  Palette keys are single ASCII letters or digits. There are at most ten slots.
- Each palette value is an RGB array of three integers 0–255. Gameplay and
  thumbnails both resolve colors through that level's palette.
- Every occupied slot must exist in `palette`. Empty cells have no palette entry.
- Distinct slots may have identical RGB values. Preserve their identities:
  joining them can change movable pieces. Four-way connected cells of one slot
  form one piece; disconnected islands remain separate pieces. Diagonal contact
  does not join pieces.
- All pieces initially have depth zero unless `initialDepths` is supplied.
  This optional array contains one integer 0–3 per connected piece, in row-major
  discovery order. It is for authored starting configurations such as Studio.
  It is not ongoing game state and must be updated if piece topology changes.

The native format keeps compact text rows. Decoder slots 0–9 can eventually map
to `A–J`, and transparent slot 10 to `.`. That conversion is not implemented here.
Do not apply a second rotation, tile conversion, or flip to a decoded grid.

## Goal and start

`goal` is `{x, y}` identifying an occupied grid cell. `start` is `{x, y, z}`:
`x` is a walking column, `y` is a ledge row (`height` means ground), and `z` is
the walking depth 0–3. The side-ground column `x = -1` is supported. A starting
position must be exposed for the configured initial depths.

Both may be `null` for an incomplete definition; such a level is retained but
cannot launch or appear among playable levels. They are not automatically guessed.
The QR decoder does not supply a start, so a future importer must establish one.

The game treats `height` as ground alignment. Keep the complete source grid and
coordinates by default. Cropping trailing empty rows can change gameplay, even
if all object coordinates are shifted correctly. Source-image display cropping
and gameplay cropping are separate concerns.

## Special objects and flags

`objects.switches` and `objects.manholes` default to empty arrays and preserve
up to ten records each. Each record requires `slot` (unique 0–9 within its list)
and grid coordinates `x`, `y`. Optional `icon` and `attributes` are bytes;
`color` is 0–15; `inverted` is boolean. Sparse original slots remain sparse.
Switch color refers to a palette slot; manhole color has its decoder meaning.

Optional `flags` retains decoder fields `raw`, `protected`, `large`,
`uses_switches`, and `uses_manholes`. `raw` is an unsigned 32-bit integer.
Unknown flag properties and bits are preserved, without assigning them mechanics.

Switches and manholes are **stored but not implemented**. A populated list, a true
uses flag, or its matching raw flag bit marks a level unsupported. Unknown object
types also mark it unsupported. They are never silently played as ordinary puzzles.
The loader's derived `compatibility` result contains `playable` and explanatory
`reasons`; this is runtime information, not an authored field.

## Source preservation

For future QR imports, use a source object such as:

```json
{
  "source": {
    "format": "pushmo-qr-decoder",
    "document": {
      "schema_version": 1,
      "payload_sha256": "...",
      "checksum": { "stored": "...", "computed": "...", "valid": true }
    }
  }
}
```

The shortened `document` above illustrates placement only. Preserve the **complete
original decoder document**, including its grid, palette indices, objects, flags,
warnings and unknown bytes. Decoder `schema_version` is independent of native
`schemaVersion`. A preserved document with `checksum.valid: false` is not playable.
This check consumes the recorded result; it does not recompute CRC without payload
bytes. Store an accompanying `.bin` separately when exact binary preservation is
needed. Use the source hash for provenance/duplicate detection, not display numbering.

For screenshot reconstructions, record the source URL, original game number,
timestamps and reference paths under `source` without inventing QR checksums.
Pixel RGB samples require piece-slot assignment before becoming native geometry.

## Legacy compatibility and scope

`loadLevelCatalog` also accepts the former unversioned array, converting the five
old slot symbols, IDs, implicit ground starts, categories and known-issue flags.
New authored files should use version 1. Unsupported versions and malformed
definitions fail with a specific data error rather than receiving invented defaults.

The current work implements the native format, legacy compatibility, and its game
integration. It does not add JSON upload, camera/QR decoding, imported-level
storage, or switch/manhole gameplay. Pull depths during play, undo history,
animation state and camera state remain separate from the stored level definition.
