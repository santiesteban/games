# Murals

The 18 Murals appear after More Challenges and before Japan Challenges. Their display
numbers are 55–72. Movement Studio and Pull out a path are now 89 and 90; their
permanent IDs (`builtin-055`, `builtin-056`) and legacy progress mappings remain
unchanged.

## Reference

Source: Pushmo — Episode 3: Murals, https://www.youtube.com/watch?v=0TAKq9xz-FA

The supplied `Pushmo_Murals` reference package contains complete original frames,
preview cards, annotated unit grids and `reconstruction.json`. Original Pushmo
numbers 37–54 are retained in each native level's `source.originalNumber`; they
are independent of Little Ledges display numbers. Timestamps, map bounds, original
grid lines and reference filenames are also retained in `source`.

| Little Ledges | Original | Name | Grid | Palette slots |
| --- | --- | --- | --- | --- |
| 55 | 37 | Strawberry | 7 × 8 | 4 |
| 56 | 38 | Chick | 9 × 8 | 4 |
| 57 | 39 | Peach | 9 × 7 | 4 |
| 58 | 40 | Shooting Star | 10 × 7 | 5 |
| 59 | 41 | Kitten | 7 × 8 | 5 |
| 60 | 42 | Crab | 13 × 8 | 5 |
| 61 | 43 | Mario (1) | 8 × 6 | 4 |
| 62 | 44 | Bananas | 8 × 8 | 3 |
| 63 | 45 | Apple Tree | 8 × 8 | 6 |
| 64 | 46 | Swim Trunks | 8 × 8 | 6 |
| 65 | 47 | Sandwich | 11 × 10 | 5 |
| 66 | 48 | Ruby Ring | 12 × 14 | 7 |
| 67 | 49 | Puppy | 7 × 8 | 5 |
| 68 | 50 | Orange | 8 × 10 | 6 |
| 69 | 51 | Snail | 11 × 10 | 6 |
| 70 | 52 | Pencil | 6 × 11 | 8 |
| 71 | 53 | Pig | 7 × 8 | 4 |
| 72 | 54 | Saturn | 15 × 13 | 7 |

## Reconstruction choices

- Preserve every occupied/empty cell, dimension and goal coordinate from the
  supplied unit-grid reconstruction. Empty space and floating islands remain empty.
- Assign movable pieces using the original black boundaries as well as colors.
  Four-way connectivity determines pieces; diagonal contact does not join them.
- Resolve video compression and triangular surface textures into flat palette
  colors using median samples from cell interiors. Similar samples from the same
  pigment share a slot, provided this preserves piece boundaries. Crab retains
  separate dark mouth tones and the divider between them.
- Use the original mural pigments, not the five-color palette of the earlier
  Little Ledges puzzles. These RGB values match the supplied video references;
  they are sampled reconstructions, not certified binary palette values.
- Ignore the blue/yellow goal artwork when choosing a cell's underlying pigment.
  Neighboring unoccluded cells provide the color for goals embedded in a larger
  piece. Apple Tree's goal apple uses its light-red apple color; Snail's eye uses
  the other eye's dark tone; Pig's ear remains continuous pink beneath the flag.
  Ruby Ring's isolated goal cell is reconstructed as a white gem highlight.
- Start Pom on ground at column 0, with all pieces retracted, consistent with
  existing native puzzles. The package specifies front maps, not depth presets
  or solutions. No switches or manholes are introduced.

The levels use the native version-1 catalog directly. No QR import interface or
camera feature is required to play them. Screenshot references document shape
and appearance; they do not establish engine solvability.
