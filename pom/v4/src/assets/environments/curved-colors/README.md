# Curved Colors — Little Ledges

Three large color fields: purple upper background, pink lower background, yellow only for the floor. Asymmetric flowing edges. Short static shadows fall down-left from upper-right light, darkening the underlying color. No character or text.

| Variant | Canvas | Measured groundAnchorY | Runtime pair bytes |
|---|---|---|---|
| Portrait | 1024 × 1536 | 0.69986979 | 17850 |
| Landscape | 2048 × 1024 | 0.70019531 | 18852 |

Use the matching background and foreground WebP together on the same canvas, with identical transforms. Backgrounds are fully opaque; foregrounds contain transparency above the yellow floor. Each variant was separately composed at native size, without upscaling or panorama cropping.

Runtime exports are lossless 8-bit SDR sRGB WebP. Editable SVG sources and lossless PNGs are included. See metadata.json and art-direction.json for anchors, colors and baked shadow parameters. Previews include combined artwork, central 80% safe margins, measured anchors, light/dark alpha checks and six static canvas framing examples.

Verified dimensions, opacity, preserved alpha, exact lossless foreground pixels, color profile and size budget. Static framing and alpha previews visually reviewed. Actual gameplay and physical iPhone tests have not been performed. No game files were changed. Shadows are baked artwork, not real-time lighting.
