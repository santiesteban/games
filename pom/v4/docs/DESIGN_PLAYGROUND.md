# Design Playground

Open **All levels → Others → Design Playground (75)**.

The scene uses Shooting Star's geometry with the standard Little Ledges palette.
Its five pieces start at different pull distances. Pom starts on the left ledge,
so reachable platform studs are visible immediately. This scene cannot be won and
does not count toward completion progress.

The scrollable controls include:

- Dark and light endpoints for all three band gradients.
- Separate horizontal and vertical grid thickness, color, and opacity.
- Selection outline visibility, color, and dashed or solid style.
- Stud visibility and outline thickness, color, and opacity.
- Existing floor fill color/opacity and grid-line color, opacity, and width.
- Real piece shadows, strength, softness, light direction, and light height.
- A reset beside every individual setting, plus Reset design, Apply to all levels,
  and Download design.

Horizontal lines run across the top's width and the side's depth. Vertical lines
follow the top's depth and the side's height. Grid thickness is a percentage of a
square; stud outline thickness is measured in screen pixels.

Shadows default to a light above and to the right. The illustrated colors stay
unchanged outside cast shadows. Pieces and studs receive the same shadow map;
a transparent shadow receiver overlays cast shadows onto the existing meadow
and grid, without adding a visible floor.

Shadow sampling follows each receiving face's slope in light space, including
the filtered sample footprint. This avoids striped self-shadowing as the camera
zooms. Only solid piece geometry casts block shadows; decorative top overlays
and offset front colors receive them without adding duplicate shadow layers.

The shipped design in `src/data/design.json` supplies the game defaults and reset
values. Cast shadows, pull-distance colors, and automatic selection of nearby
pieces are enabled by default. Existing saved settings remain respected.
Drafts are saved locally under `little-ledges:v4:design-playground` and
affect only this scene until **Apply to all levels** is pressed. Applying copies
the current draft to `little-ledges:v4:applied-design`, refreshes all levels, and
sets the stud, shadow, and custom-floor-grid feature toggles to match the design. Pull-distance
colors are enabled so the chosen gradients and grid lines appear. Other control
preferences stay as they are. The applied design persists across reloads and
syncs across tabs on the same origin. Later draft changes remain local to the
playground until applied again. Reset design restores the shipped draft; apply
it to restore the game defaults everywhere. Download design exports a JSON
snapshot for sharing.

Selection outlines default to the existing dark dashed line. Older saved designs
inherit these defaults. All three outline controls have individual resets and are
included in saved drafts, downloads, and Apply to all levels.

The controls use their own native wheel, touch, and keyboard scrolling, isolated
from the game's input handlers. On phones the panel has a bounded height with an
independently scrolling body.

## Custom floor grid

Settings → Experimental controls → **Custom floor grid** enables custom styling
in normal levels and is now enabled by default. In Design Playground, use **Floor grid
→ Customize floor grid** to preview the draft.

- **Floor color** and **Floor opacity** control the fill within the existing
  projected walking grid. Opacity ranges from 0–100%; 0% leaves the fill transparent.
- **Floor grid line color** and **Floor grid line opacity** control the lines
  separately from the fill.
- **Floor grid line width** ranges from 0–8 screen pixels. Zero hides the lines.

The floor keeps its existing flat geometry, camera projection, horizon clipping,
and movement behavior. The complete fill replaces the original skipped gray cell
tints so its opacity is controlled by a single setting. Scenery washes outside the floor
and the black horizon retain their environment-specific appearance.

Every control has an individual reset. The new settings are included in saved
drafts, Apply to all levels, and design JSON downloads. Older saved designs inherit
the defaults without losing unrelated settings. The earlier raised-tile controls
and feature flag have been removed; their saved fields are ignored.

### Approved floor defaults

The approved floor uses white (`#ffffff`) at 30% opacity, black (`#000000`) lines
at 7% opacity, and a 2 px line width. These values also supply individual resets.
Floor revision 1 adopts the approved floor settings and enables the feature for
older saves, preserving other design fields and control preferences. Subsequent
floor edits and explicit feature-toggle choices remain respected.

`puzzleFloorBounds` in `src/floor-grid.js` derives a complete rectangular footprint
from the occupied puzzle columns, with one square of visual margin on either side
and four rows of depth (three pull steps and one front row). Empty image padding
does not create surplus columns. Fill and lines share the same bounds; the camera
fit reserves the whole footprint at all six angles. The grid is aligned exactly
to the ground, without the previous fractional extra row. This changes scenery
geometry only; authored movement rules are preserved.
