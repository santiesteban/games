# Home artwork

From the user-supplied `home-screen-reference-v9 2` package, October 24, 2026.

- `artwork.svg` retains the earlier composed portrait option. The current version
  uses separate fixed-size pieces on all screens, with `paper.svg` extracting the
  supplied mint paper background. Resizing repositions/clips the pieces without
  scaling them; their pixel widths are defined once in the stylesheet.
- The piece SVGs start with the groups from `little-ledges-blocks.svg`. The upper
  cream cross is omitted, and the lower yellow piece is moved/rotated. Each has a fitted
  viewBox. `pom-perch.svg` redraws the same stepped platform upright with square
  front faces and one consistent depth offset. It keeps the supplied palette and
  original Pom paths/facial proportions, repositioning Pom and the flag on the
  corresponding top faces without stretching them. The complete piece has a
  gentle four-degree rotation in the layout, darker side/step shadows, and a soft
  contact shadow underneath Pom.
- `logo.svg` copies the tilted logo group from `little-ledges-home.svg` with a
  fitted viewBox. Its L is already a path rather than a font glyph.
- The logo, title, primary button, and decorative pieces all keep fixed pixel
  dimensions across layouts. Wide/short layouts reposition the same pieces. Very
  short screens scroll rather than shrinking the central controls. Settings uses
  a gear with a text accessibility label.
- The later `Screenshot 2026-10-25 at 12.31.13 a.m.` reference supplies the updated
  palette and material appearance. Colors were sampled after converting its
  embedded display profile to sRGB. Fine geometric linework and grain are native
  SVG patterns; the logo/button use a warm orange gradient. These recreate the
  texture's appearance rather than extracting its exact raster pattern.
- The logo's cream L comprises three equal 28-unit squares with gently rounded
  corners. The title uses tighter lines, heavy Nunito, and a small matching stroke.
  Geometry and textures are edited as SVG; no raster artwork was regenerated.

Home-specific type uses the open-source Nunito family with Arial Rounded MT Bold
as a fallback. Other screens retain their existing typography and controls.

The top-right column joins two coral cells and one yellow cell with continuous edges.
Decorative piece outlines are normalized to 2.4 screen pixels at their fixed widths.
The home logo includes a tiny Pom on its inner ledge; header-logo.svg keeps the same
36-unit face and 2.5-unit outline as the level badge inside a 42-unit viewBox.
