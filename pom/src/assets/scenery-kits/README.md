# Little Ledges modular scenery kits

Meadow and Japan Spring each contain 11 runtime WebP images: sky, distant hills, ground tile, and eight upright vegetation cutouts. The runtime uses the user-supplied optimized exports received on 2026-10-27. The original PNG masters and generation sources remain in the separate painterly-v2 authoring package; they are not shipped here.

The optimized sets total 2,666,984 bytes, reduced from 15,775,600 bytes. Their dimensions, every alpha value, visible bounds, and ground-contact registration match the previous exports exactly. RGB is compressed with a lossy encoder. Compression introduces small differences between opposite tile-edge pixels, so the runtime WebPs no longer claim identical boundary texels. See `optimization.json` for before/after sizes, hashes, and measured edge differences, and `runtime-manifest.json` for current runtime hashes.

Use sky as a distant upright backdrop, distant hills as a vertical silhouette strip, and ground-tile on a horizontal floor repeating once per 16 × 16 puzzle units. Cutouts are fixed in world orientation. No camera perspective is baked into the images. Broad upper-left/front highlights are painted self-shading; the renderer supplies physical edge thickness, contact and cast shadows.

Pivots use pixel-boundary coordinates: trees [1024, 1984], smaller plants [512, 992]. The last supporting raster row is 1983 or 991. Metadata retains the original source dimensions, uniform resampling, source crops, PNG master sizes, and proposed world heights alongside updated runtime WebP sizes. Optimization did not resize, crop, recolor, or move the artwork.

The painterly-v2 source revision replaced all 16 vegetation cutouts with broad painted masses. Native generations are individual source PNG layers; editable layered painting files are not available. The separate authoring package contains registration/export recipes and previews. `generation-prompts-and-provenance.json` preserves the original generation record. `optimization.json` records the subsequent user-supplied compression separately.
