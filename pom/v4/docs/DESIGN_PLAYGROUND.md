# Design Playground

Open **All levels → Others → Design Playground (75)**.

The scene uses Shooting Star's geometry with the standard Little Ledges palette.
Its five pieces start at different pull distances. Pom starts on the left ledge,
so reachable platform studs are visible immediately. This scene cannot be won and
does not count toward completion progress or appear as a victory's next level.

The scrollable controls include:

- Dark and light endpoints for all three band gradients.
- Separate horizontal and vertical grid thickness, color, and opacity.
- Stud visibility and outline thickness, color, and opacity.
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

The shipped design in `src/data/design.json` supplies the game defaults and reset
values. Cast shadows, pull-distance colors, and automatic selection of nearby
pieces are enabled by default. Existing saved settings remain respected.
Drafts are saved locally under `little-ledges:v4:design-playground` and
affect only this scene until **Apply to all levels** is pressed. Applying copies
the current draft to `little-ledges:v4:applied-design`, refreshes all levels, and
sets the stud and shadow feature toggles to match the design. Pull-distance
colors are enabled so the chosen gradients and grid lines appear. Other control
preferences stay as they are. The applied design persists across reloads and
syncs across tabs on the same origin. Later draft changes remain local to the
playground until applied again. Reset design restores the shipped draft; apply
it to restore the game defaults everywhere. Download design exports a JSON
snapshot for sharing.
