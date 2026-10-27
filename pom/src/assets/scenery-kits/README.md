# Little Ledges modular scenery kits — painterly vegetation v2

Revision: all16 vegetation cutouts replaced with much simpler broad painted masses. No individual leaf/blossom rendering, veins or bark grooves. The6 sky/hill/ground images retain the prior artwork. Previous package is preserved separately.

Meadow and Japan Spring each contain11 independent runtime PNGs and matching WebP files. These are reusable world surfaces and upright painted cutouts, not old background/foreground pairs. Existing game files were not modified.

Use sky as a distant upright backdrop; distant hills as a vertical silhouette strip; ground-tile on a horizontal floor, repeating once per16×16 puzzle units. Cutouts are front-facing illustrations fixed in world orientation. No camera perspective is baked into runtime images. Broad upper-left/front highlights are painted self-shading only. Renderer must supply physical edge thickness, contact and cast shadows.

PNG masters carry sRGB profiles. Opaque sky and ground have high-quality WebP copies; cutout/hill WebPs are lossless RGBA. Alpha cleanup removes tiny generator specks and registers supporting pixels to exact baselines. Pivots use pixel-boundary coordinates: tree[1024,1984], smaller plants[512,992], so last supporting raster row is1983/991. Exact measured bounds, native source sizes, uniform resampling, source crops, final sizes, byte counts and proposed world heights are in each metadata.json.

Native generations are individual source PNG layers; editable layered painting files are not available. Registration and export recipes are supplied in sources/authoring-recipes/. Full generation prompts and provenance are included. Images were generated with built-in image generation, followed by mechanical registration, alpha normalization and opposite-edge matching for tiling. No images were stretched to a different aspect ratio.

Previews include labeled contact sheets,2×1 sky/hill repeats,2×2 ground repeats, every cutout on cream/dark-blue/checkerboard, and1600×900 plus900×1600 perspective compositions using35° vertical FOV and20° downward pitch. Neutral puzzle placeholder and all preview perspective are excluded from runtime images. Mockups are illustrative compositions, not game verification. Infinite-floor horizon may sit outside view at this pitch/FOV; previews use a finite scenery stage.

The new modular contract requires renderer integration. Actual gameplay, tracking/orbit clearance and physical-device testing remain. Artwork intentionally uses the same illustrated family across both themes; Japan has separate cherry trees and sparse fallen petals on its ground tile. No prominent trees are duplicated in either sky or hill backdrop.