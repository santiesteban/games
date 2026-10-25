# Background Studio and environments

Background Studio is level 76 under **Others**, after Design Playground. It uses
the same standard-palette Shooting Star board for comparison. It is playable but
cannot complete and does not count toward progress. Preview controls are scoped
to this studio and reset when the page is reloaded.

## Controls

- **Environment:** Highway Desert, Cobblestone Alley, or the original Meadow.
- **Composition:** Automatic, Portrait, Landscape, or Original panorama for
  environments with responsive artwork. Automatic follows the actual canvas,
  including studio-panel layout changes; manual choices are studio-only.
- **Show:** both layers, background only, or foreground only. Foreground-only
  previews use a neutral lavender backing to reveal transparent areas.
- **Ground anchor:** the vertical fraction of the source image that meets the
  projected ground horizon. Reset restores the current composition's measured
  default. Preview adjustments are retained separately per composition until
  reload; a portrait adjustment does not overwrite the landscape anchor.
- **Show floor guide:** toggles the black horizon, ground grid, and floor washes.
- **Background overlay / Foreground overlay:** independent color and 0–100%
  opacity controls, with a reset for each value. The background tint covers the
  visible scenery above the projected horizon; the foreground tint starts at
  that line and covers the scenery below it. They do not tint Pom or the pieces.
  The same boundary is used even when the floor guide is hidden or an individual
  artwork layer is being inspected. Overlays sit behind the floor styling and
  cast shadows. Both start at 0% (off) and stay scoped to this studio.
- **Reset preview:** restores Highway Desert, 80%, both layers, the floor guide,
  and both overlays to their untinted defaults.

The controls scroll independently of gameplay. On narrow screens they appear
below the scene and can be collapsed to enlarge the play area. Existing pan,
zoom, and all six camera angles remain available.

## Environment metadata

`src/environments.js` owns the local asset registry and its lazy texture loader.
The original Meadow keeps its 60% ground anchor and independent sky/ground
placement. Highway Desert uses:

```js
{
  id: 'highway-desert',
  aspectRatio: 3,
  groundAnchorY: 0.80,
  registeredLayers: true,
  foregroundOpacity: 1,
  groundWashOpacity: 0,
  floorWashOpacity: 0,
  floorTileOpacity: 0
}
```

`registeredLayers` gives both artwork layers exactly the same size and screen
position, preserving their painted alignment at every camera angle. The size
covers the viewport above and below the ground anchor and across its full width.
The layers remain behind the puzzle, floor guide, and actual cast shadows.
Highway Desert receives no tint or white floor wash, preserving its painted
colors. Its textures use smooth filtering; the WebP files are not re-encoded.

A group or an individual level may optionally specify `"environment":
"highway-desert"`. The individual level takes priority over its group. Unset or
unrecognized environment IDs use Meadow. Only Background Studio is assigned the
new environment for now. New scenery loads when first requested, not during the
initial game loading screen. Both textures must decode before the scene switches;
stale requests cannot overwrite a newer selection. Failed requests retain the
previous scenery and can be retried by selecting another environment and back.

For new artwork, follow the [phone-first artwork brief](BACKGROUND_ARTWORK.md):
1024 × 1536 portrait and 2048 × 1024 landscape compositions, each delivered as
an aligned background/foreground pair. This supersedes the earlier 3:1 export
requirement. Responsive selection and scenery framing are now implemented;
Cobblestone Alley is the first environment with both compositions.

Meadow and Highway Desert remain 3:1 landscapes, cropped to the available play
area on narrow screens. Highway Desert has no extra painted detail at high zoom: its
3072 × 1024 exports were resized from 2048 × 682.

## Highway Desert provenance

Source: `Little_Ledges_Highway_Desert_Gray_Line_Removed.zip` in Downloads.
Earlier export packages were not used. Only the two runtime WebPs are copied
into `src/assets/environments/highway-desert/`; PNG masters and source painting
remain in the supplied package. No artwork was regenerated or altered.

| Runtime file | Source filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `background.webp` | `Highway_Desert_background_3072x1024.webp` | 284076 | `ba3d5a8f8f00ffc10eddaf62415896bfc7add744365e10cd480b32daf6b73643` |
| `foreground.webp` | `Highway_Desert_foreground_3072x1024.webp` | 59814 | `7ff550e4d5e890692d26ca8c0caa482d82fa7681d5692e1e7f50c5d915199964` |

Both images are 3072 × 1024. The background is RGB. The foreground is RGBA with
alpha ranging from 0 to 255 and 21,513 partially transparent antialiasing pixels.
Its center crosses 50% opacity at row 821 (approximately 80.2% of image height).

## Integration review

- Verified the copied WebPs match the latest ZIP byte for byte.
- Inspected both layers separately and combined for road edges and stray seams.
- Checked wide and narrow scenes, alternate camera angles, and zooming in game.
- Checked the 80% anchor, its slider/reset, and Meadow's separate 60% default.
- Checked phone control scrolling and collapse/expand behavior.
- Passed 2,240 layout combinations covering narrow/wide views, zoom scales,
  ground positions, and anchor values; the registered layers stay aligned and
  cover the viewport.
- Confirmed returning from Background Studio to Lesson 1 restores Meadow's 60%
  anchor, hides the studio controls, and restores the normal full-width layout.
- The final navigation review produced no browser console errors.

The browser phone preview does not replace a check on a physical iPhone.

## Cobblestone Alley — original fallback

Available as `cobblestone-alley` in Background Studio. The supplied artwork is
copied unchanged to `src/assets/environments/cobblestone-alley/`:

| Runtime file | Supplied asset | Size | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `background.webp` | `da9240e8-6087-4aa1-abb2-d11b0a368e14 (1).webp` | 3072 × 1023 | 363868 | `f8cbcf0ab6965da6036e787780b9f82b946a4e0d34d77012d5ad74da6e50fae2` |
| `foreground.webp` | `City_Alley_Foreground_Border_Fixed/City_Alley_foreground_3072x1024.webp` | 3072 × 1024 | 80172 | `c2780d070bccd41d8536de4432caf7eddd268d0e9ef7ee5e29f82b3dfb73edd2` |

The PNG master remains in Downloads. The foreground has transparent upper pixels,
15,770 partially transparent edge pixels, and a central boundary at row 840
(approximately 82% of its height). It uses an 82% ground anchor, registered layers,
and the supplied colors at full foreground opacity, without additional scenery
washes. The approved gameplay floor styling can still overlay its floor guide.

The source background is one pixel shorter than the foreground. `backgroundSize`
records its exact dimensions for validation; both layers share the same normalized
3:1 display frame. No image files are resized, regenerated, or re-encoded. Other
environments retain their own anchors and layer alignment.

## Cobblestone Alley — responsive artwork, October 24

Source delivery: `2026-10-24/referenced-chatgpt-conversation-this-is-an/outputs/
cobblestone-alley/` under the Codex documents folder. Read its README, artwork
brief, and metadata before integrating. The supplied runtime files are copied
unchanged into the existing alley asset directory; the original panorama above
is retained. PNG layers, source paintings, and art-only previews stay in the
delivery package. `artwork-metadata.json` retains that package's provenance and
limitations at delivery time, rather than claiming it was already tested in game.

| Composition | Both layers | Ground anchor | Pair bytes |
| --- | --- | ---: | ---: |
| Portrait | 1024 × 1536 | 0.66731771 | 425728 |
| Landscape | 2048 × 1024 | 0.78808594 | 412532 |

Files are named `cobblestone-alley-{portrait|landscape}-{background|foreground}.webp`.
Portrait is separately composed at its native resolution. Landscape was uniformly
resized from 1774 × 887 to 2048 × 1024 by the artwork producer; it has no extra
detail from that resize. Each background is opaque; its matching foreground
retains the supplied alpha. Colors, compression, and image content were not edited.

### Selection, framing, and loading

`environment-layout.js` evaluates the visible image area after anchor alignment.
Automatic selection uses canvas width/height and the fitted-board horizon,
independent of puzzle pan/zoom. It keeps the current composition until another
requires at least 15% less image area, avoiding flicker near the crossover.
Resizing, rotating, opening/collapsing panels, changing boards, and changing
camera angles re-evaluate that choice. Existing environments without variants
continue to use their original pair.

Both registered layers share a transform. Framing uses the minimum image scale
that covers the canvas above/below the horizon and across its width. The former
115% fitted-board overscan has been removed. At a fixed screen horizon, zooming
the board leaves scenery framing unchanged. If the projected ground moves during
pan/zoom, the painting follows it; additional scale is limited to what is needed
to avoid exposing empty edges. Some cropping therefore remains necessary.

`environment-loader.js` caches each environment/composition separately and loads
only requested pairs. Both images decode and pass dimension validation before
their textures are published together. A request counter prevents a late response
from replacing a newer choice. If a responsive pair fails, the loader attempts
the retained original panorama; otherwise it keeps the preceding scenery. Select
the environment or composition again to retry. Manual Original panorama also
provides a direct comparison with the previous artwork.

### Integration review

- Production build passed; all 27 automated tests passed, including nine new
  layout/loading tests. Shared-frame checks cover six canvas sizes, five horizon
  positions, and three camera scales for both variants.
- Browser checks used exact gameplay canvases of 360 × 560, 390 × 650,
  430 × 740, 768 × 700, 1280 × 600, and 740 × 360.
- Checked portrait/landscape switching, the studio panel expanded/collapsed,
  puzzle zoom, all six camera poses, and pulling a piece.
- Checked individual layer visibility, floor-guide updates, per-composition
  anchor reset, and the retained original panorama. An isolated preview with a
  deliberately invalid portrait layer successfully fell back to the original
  alley and remained responsive to later environment choices.
- A temporary isolated preview assigned the alley to ordinary levels to check
  Lesson 1 (4 × 4), Challenge 1-8 (4 × 10), Chick (9 × 8), and Saturn (15 × 13).
  Normal catalog assignments in the game were not changed by that review.
- The puzzle remains distinguishable, and no empty edges or broad alpha halos
  were observed in the checked views. The scenery's architectural outlines are
  busier than Meadow. Foreground art visually matches its background rather than
  being a pixel-identical extraction; the layers intentionally have no independent
  parallax. The curved terrain edge cannot coincide everywhere with the game's
  straight black horizon guide, especially near the expendable sides.
- Physical iPhone review is still outstanding. Browser viewport checks do not
  establish final device approval.
