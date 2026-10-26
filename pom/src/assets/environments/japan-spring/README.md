# Japan Spring

Runtime layers from the revised `japan-spring-artwork.zip` kit. This environment is available in Background Studio as **Japan Spring**, including automatic composition selection and the existing layer, overlay and anchor controls. Apply to all levels remains an explicit studio action.

| Composition | Canvas | Measured ground anchor |
|---|---|---|
| Portrait | 1024 × 1536 | 1244 / 1536 = 0.8098958333333334 |
| Landscape | 2048 × 1024 | 870 / 1024 = 0.849609375 |

The renderer reads each composition's dimensions and ground anchor from `artwork-metadata.json`, using the same transform for its registered background and foreground pair. These measured values differ from the nominal 70% artwork brief; they do not change other environments' anchors.

Backgrounds are opaque quality-92 sRGB WebP. Foregrounds use lossless WebP alpha and contain only the near meadow; cherry trees remain in the background. Both compositions retain the supplied colors, texture, geometry and alpha edges. Portrait and landscape are independently composed. The landscape source was 1774 × 887, uniformly resized to 2048 × 1024; portrait is native 1024 × 1536. Each runtime pair is under 1 MB.

Source metadata verification flags describe the artwork kit's checks, not a physical-device certification. PNG masters, generation sources, masks and static previews stay in the source kit rather than the runtime bundle.
