# Pullout Switch

## Behavior

A pullout switch is placed on an occupied top-edge square and targets one used
palette slot. Pom activates it on level start or when arriving on that square.
It extends every piece of the target color to depth 3. It may activate again
only while at least one target piece is short of maximum depth.

A switch cannot share its square with the flag, a warp pipe, or another switch.
If the extension reaches Pom, he jumps onto an extending piece when its top is
safely exposed; otherwise the piece pushes him forward and he falls to the first
walkable surface below. Activation is part of the movement/manipulation undo
step. A switch is raised while it can extend a target piece and Pom is not
standing on it; otherwise it recedes into the host piece. The host's front face
always carries a downward-pointing, switch-colored triangle inside a
rounded-square badge, without shadows. A small solid 3D triangle rests on the host's top while the
switch can extend a target piece and Pom is not standing on it; otherwise it
recedes into the host. The triangle has no outline or shadow.

## Data and compatibility

Native catalog levels and standalone puzzles use `{x, y, color}` switch records.
The standalone puzzle contract uses rules version 2 when switches are present;
version-1 switch-free puzzle JSON, links, and revisions remain unchanged. The
creator's draft history and saved-state signatures include switch placements.

Pushmo decoder records in `objects.switches` remain unsupported. Their source
attributes are preserved; similar names do not establish equivalent behavior.

## Verification

`src/pullout-switch.test.js` covers data round trips and validation, repeat
activation, Pom's jump/push/fall outcomes, catalog compatibility, and solver /
replay agreement. The full game and creator builds plus restricted-player build
are required integration checks.