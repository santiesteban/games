# Japan Challenges

16 puzzles decoded from the 23 supplied Pushmo JPEG QR cards. They appear after Murals and before Others, as levels 73–88. Others now uses 89–92; permanent IDs and legacy completion mappings are unchanged. My Puzzles remains last.

## Conversion

- All 23 QR payloads passed their original CRC check. Seven use pullout switches and are omitted entirely; none use manholes.
- Native geometry and RGB palettes come from the decoded bytes. No tracing, guessed cells, new platforms, or replacement flags.
- Crop only transparent outer rows and columns. The bottom occupied row meets the floor; all internal geometry and goal offsets remain unchanged.
- Pom starts on the ground at the first occupied bottom-row column, depth zero. Every piece starts unpulled at depth zero.
- The complete original decoder document, reference JPEG filename, SHA-256 hash, original title, source difficulty, and crop offsets are retained in each level’s `source` metadata.
- The group uses `japan-spring`, with its registered portrait and landscape layers. An explicitly applied Background Studio configuration retains its existing all-level override behavior; **Use level backgrounds** restores group scenery.

## Estimated difficulty order

Original difficulty (1–5) is the primary signal. Within a rating, sort by `4 × connected pieces + 2 × goal climb + occupied cells / 16`, then stable ID. This provides a reproducible estimate of manipulation and navigation demands. It is not a shortest-solution ranking or a proof of solvability in Little Ledges. No complete solution search has been run.

| Level | Title | Original rating | Grid | Pieces | Reference card |
| --- | --- | --- | --- | --- | --- |
| 73 | Push & Pull Practice | 1/5 | 10 × 8 | 5 | `tumblr_ohoaf0RjSI1va8x18o1_400.jpg` |
| 74 | Puzzle Blocks 1 | 1/5 | 7 × 11 | 11 | `tumblr_oavp1yBDpd1va8x18o1_400.jpg` |
| 75 | Star | 2/5 | 9 × 9 | 5 | `tumblr_ol9op96GZA1va8x18o1_400.jpg` |
| 76 | Star Frame | 2/5 | 9 × 9 | 7 | `tumblr_ol9opmPDPU1va8x18o1_400.jpg` |
| 77 | Puzzle Blocks 4 | 2/5 | 8 × 8 | 10 | `tumblr_ohoaiwOYZ51va8x18o1_400.jpg` |
| 78 | Eight by Eight | 2/5 | 8 × 8 | 12 | `tumblr_ohoag8yR041va8x18o1_400.jpg` |
| 79 | Puzzle Blocks 2 | 2/5 | 11 × 11 | 18 | `tumblr_oavp49q0Na1va8x18o1_400.jpg` |
| 80 | Snake Box | 3/5 | 8 × 8 | 8 | `tumblr_oavp7ncQLo1va8x18o1_400.jpg` |
| 81 | Small Challenge 2 | 3/5 | 7 × 9 | 8 | `tumblr_oad7beNjLU1va8x18o1_400.jpg` |
| 82 | Puzzle Blocks 3 | 3/5 | 13 × 10 | 8 | `tumblr_oavp6rACeU1va8x18o1_400.jpg` |
| 83 | Puzzle Blocks 13 | 3/5 | 11 × 9 | 9 | `tumblr_oavp8w7Lcb1va8x18o1_400.jpg` |
| 84 | Challenge Web 1 | 3/5 | 11 × 9 | 9 | `tumblr_p2iborgUl21va8x18o1_400.jpg` |
| 85 | Puzzle 04 | 4/5 | 8 × 8 | 20 | `tumblr_oavp5ax4sk1va8x18o1_400.jpg` |
| 86 | Super Block 17 | 5/5 | 8 × 8 | 7 | `tumblr_oad77dy8Sp1va8x18o1_400.jpg` |
| 87 | Pushmo Paradise | 5/5 | 16 × 16 | 38 | `tumblr_oloa6ndnBZ1va8x18o1_400.jpg` |
| 88 | Pushmo Heaven | 5/5 | 16 × 16 | 47 | `tumblr_oloa7gcRQD1va8x18o1_400.jpg` |

## Omitted cards

All of these need pullout switches, which Little Ledges does not implement. Their geometry and goals have not been adapted or added to the catalog.

| Original title | Reference card |
| --- | --- |
| パズル01 | `tumblr_oa60h9OOxL1va8x18o1_400.jpg` |
| ヒキダシスイッチ | `tumblr_oad75dnTYa1va8x18o1_400.jpg` |
| ましかくパズル | `tumblr_oavp2tlEgg1va8x18o1_400.jpg` |
| アスレチック2 | `tumblr_ohoajwGvmD1va8x18o1_400.jpg` |
| ■ | `tumblr_ol9osamDol1va8x18o1_400.jpg` |
| ヒクオスクロス | `tumblr_oqm1bi9wX81va8x18o1_400.jpg` |
| ウズマキグルグル | `tumblr_oqm1puYhF01va8x18o1_400.jpg` |

## Import checks

Catalog loading confirms compatible starts, goals, dimensions, object records and piece-depth counts. Each occupied source cell and source goal was compared against its translated native coordinate. Every native bottom row contains puzzle cells. Existing puzzles were compared against the prior catalog: only the four Others display numbers changed.
