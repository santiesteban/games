# Runtime verification

The optimized Meadow and Japan Spring exports supplied on 2026-10-27 replace all 22 runtime WebP files. All files decode successfully at their expected dimensions. Every alpha pixel and measured alpha bound matches the previous runtime export exactly, including the vegetation contact baselines and pivot support. Sky and ground remain fully opaque. No placement or world-scale changes are needed.

The original PNG master verification remains part of the separate painterly-v2 authoring package. Its lossless WebP RGB and identical boundary-texel claims describe the previous exports. The new runtime exports use lossy RGB compression with exact alpha. Opposite-edge mean channel differences are at most 1.54 on a 0–255 scale; full measurements and before/after hashes are recorded in `optimization.json`.

Meadow: 8,391,352 → 1,343,596 bytes (83.99% smaller).
Japan Spring: 7,384,248 → 1,323,388 bytes (82.08% smaller).
Combined: 15,775,600 → 2,666,984 bytes (83.09% smaller).

The game and restricted playtest production builds pass, along with all 47 existing tests. Browser review confirmed both modular sets load successfully with transparent vegetation and grounded contact, and Meadow remains registered while orbiting to either ±35° side angle. No visible tile seams appeared in the reviewed views. The normal game also loads the optimized Meadow set. Review was on the desktop browser, not a physical phone.
