# Little Ledges — background artwork requirements

Updated October 24, 2026. This brief supersedes the earlier 3:1 panorama-first
requirements. Phones are a primary audience: compose the phone version first.

## Required delivery for each environment

Deliver **two compositions**, each with a background and a matching foreground:

| Version | Exact runtime size for each layer | Aspect ratio | Intended play area |
| --- | --- | --- | --- |
| Portrait — primary | **1024 × 1536 px** | **2:3** | Tall phone gameplay areas, below the header and above the controls |
| Landscape — secondary | **2048 × 1024 px** | **2:1** | Wide desktop, tablet, and landscape phone gameplay areas |

These ratios describe the **gameplay canvas**, not the full device screen. The
header, browser bars, controls, and studio panel reduce the available area.
Portrait 2:3 is a starting composition for that usable area; it is not a promise
of zero cropping on every device. Some trimming will still occur as its shape
changes.

The portrait must be composed for portrait: reveal enough sky, scenery, and ground
to make a complete scene in a narrow frame. Use the same setting, palette,
lighting, and recognizable landmarks in landscape, with additional scenery at
the sides. A center crop of a wide panorama is not an adequate portrait delivery.

Existing 3:1 environments remain usable as legacy artwork. New environments do
not need a 3:1 export. A third tablet composition can be added later if the two
required versions leave an important gap.

## Composition

- Leave the middle of the image calm enough for a colorful puzzle and Pom to read
  clearly. The board can occupy much of the scene, including its upper portion.
- Keep important landmarks recognizable in the central **80% of the width** and
  **80% of the height** of each composition. Treat the outer 10% on each edge as
  expendable scenery. This is a composition guide, not a guaranteed visible area.
- Include foreground terrain with enough texture to establish the setting, while
  keeping it quieter than the puzzle. Avoid a bright or high-contrast stripe
  directly behind Pom.
- Use light from the upper right, consistent with the game's cast shadows.
- Supply artwork without the puzzle, Pom, flags, interface text, floor grid,
  straight black horizon line, or shadows belonging to the game pieces.
- Preserve painted color and texture. Supply natural detail at the actual source
  resolution; larger exports made by upscaling do not count as additional detail.

## Background and foreground layers

Each composition is an aligned pair with **identical pixel dimensions and canvas
coordinates**:

1. **Background:** fully opaque; contains sky, architecture or distant landscape,
   plus a complete base terrain behind the transparent foreground edge.
2. **Foreground:** transparent above the near ground surface; contains only the
   near ground artwork. Retain smooth, antialiased alpha at its silhouette.

Do not independently trim, stretch, or crop either layer. They must register when
overlaid at the same size and position. Include enough overlap behind the edge
to avoid gaps, halos, duplicate roads, and visible seams. Review transparency on
both light and dark backings.

### Ground anchor

Provide a separate **`groundAnchorY` for each composition**: a fraction from the
top of the canvas to the ground boundary at its horizontal center. For example,
`0.70` means 70% down the image. Mark this boundary in a reference preview.

For a new composition, begin the layout around **70%**, leaving roughly 30% of
the image for near ground, then refine it in Background Studio. This is a layout
starting point, not a fixed requirement. The final anchor should match the art
and remain configurable per version. Existing Meadow (60%), Highway Desert
(80%), and Cobblestone Alley (82%) keep their current values.

Avoid a strongly slanted or curved central ground boundary that would make the
game's straight floor horizon appear disconnected from the painting.

## Files and export

- **Runtime:** WebP, sRGB, SDR, 8 bits per channel. Opaque background; foreground
  with alpha. Inspect the exported foreground for colored fringes and compression
  damage around the edge.
- **Source:** retain the original painting or layered source and lossless PNG
  exports. Higher-resolution masters are welcome when they contain genuine
  additional detail; an oversized master is not required.
- **Size budget:** aim for **1 MB or less for each background/foreground pair**.
  This is an optimization target: preserve the painted appearance and smooth
  transparency instead of forcing a visibly damaged export under the budget.
- **Preview:** include an unmodified combined preview for each composition, plus
  a copy indicating the ground anchor and composition margins.

Use descriptive environment names, for example:

```text
cobblestone-alley-portrait-background.webp       1024 × 1536
cobblestone-alley-portrait-foreground.webp       1024 × 1536
cobblestone-alley-landscape-background.webp      2048 × 1024
cobblestone-alley-landscape-foreground.webp      2048 × 1024
```

Include the environment name, file dimensions, anchor for each composition,
original painting resolution, and whether any export was resized.

## Renderer integration

**Implemented October 24, 2026 for the new Cobblestone Alley delivery.** The
registry supports portrait/landscape pairs alongside a legacy pair. Existing
single-pair environments remain compatible. See
[Background Studio](BACKGROUND_STUDIO.md) for the delivered files, measured
anchors, review results, and remaining physical-device check.

The renderer follows these rules:

1. Portrait and landscape variants each carry their own dimensions and ground
   anchor. The original single pair remains available as a fallback.
2. Choose the composition using the **actual canvas dimensions**, including
   changes caused by controls and studio panels. Select the variant requiring
   less cropping while satisfying ground alignment. Switching requires at least
   15% less image area than the current composition. Selection uses the fitted
   board's horizon, so puzzle pan/zoom cannot trigger a composition download.
3. Keep both layers registered under a shared transform and preserve their
   aspect ratio. Cover the canvas with the minimum scale needed above and below
   the ground anchor, allowing only the overscan needed for scene movement.
4. Scenery size depends on the visible canvas and projected horizon, not the
   board's fitted height. At a fixed on-screen horizon its framing stays identical
   through zoom. Panning/zooming can still move the ground horizon; the painting
   then translates and, only as needed, grows enough to keep both edges covered.
5. Load the selected pair on demand, cache it, and switch after both layers have
   decoded. Avoid downloading every composition at startup.

Supported variant shape inside an environment registry entry (also retain the
entry's legacy `background`, `foreground`, dimensions, and anchor):

```json
{
  "id": "new-environment",
  "variants": {
    "portrait": {
      "background": "new-environment-portrait-background.webp",
      "foreground": "new-environment-portrait-foreground.webp",
      "width": 1024,
      "height": 1536,
      "groundAnchorY": 0.70
    },
    "landscape": {
      "background": "new-environment-landscape-background.webp",
      "foreground": "new-environment-landscape-foreground.webp",
      "width": 2048,
      "height": 1024,
      "groundAnchorY": 0.70
    }
  }
}
```

The two `0.70` values above are examples; measure each delivered composition.

## Review on integration

Review actual gameplay canvases around **360 × 560**, **390 × 650**,
**430 × 740**, **768 × 700**, and **1280 × 600** pixels, plus a landscape phone
with its controls visible. These are coverage targets, not fixed device sizes.
Include portrait/landscape rotation, expanded/collapsed studio panels, different
board sizes, all camera angles, and puzzle zoom.

Confirm that the scene still reads as a complete setting, the puzzle stays
legible, layer edges remain aligned, and no empty area or duplicate terrain
appears. Include a physical iPhone review before final approval.

This uses *art direction* (different compositions for different layouts), in
addition to choosing a useful resolution. See
[MDN's responsive image guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images).
