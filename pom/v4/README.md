# Pom v4

Pom v4 is a fresh LittleJS remake of the original Little Ledges puzzle. The board, pullable block pieces, mascot, flag, and lighting are rendered with LittleJS's native 3D renderer. The interface and meadow artwork follow v1.

## Run locally

```sh
npm ci
npm run dev
```

## Controls

- Click an exposed block face to select the connected piece.
- Click a reachable ledge to move Pom.
- Use **Pull out** and **Push in** while Pom is beside a piece.
- **Undo** or `Z` reverses the last move; **Start over** or `R` resets the puzzle.
- Rotate the camera with the view buttons or the arrow keys.

The game uses the original v1 meadow and sky images from the parent game folder. The Pages workflow builds v4 and publishes it at `/games/pom/v4/`.
