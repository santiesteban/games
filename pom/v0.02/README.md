# Little Ledges v0.02

Pom is a small web-first pull-and-climb puzzle built with Three.js, TypeScript, and Vite.

## Run locally

```sh
cd pom/v0.02
npm install
npm run dev
```

Create a production web build from `pom/v0.02/` with `npm run build`, then serve the `pom/v0.02/dist/` folder with any static web host.

## Publish with GitHub Pages

The repository-root workflow at `.github/workflows/deploy.yml` builds the game from `pom/v0.02/` and publishes its compiled files at `/games/pom/v0.02/` when you push to `main`. The original game is archived at `/games/pom/v0.01/`; the current game is served from `/games/pom/`. You can run it manually from the repository's **Actions** tab. No server-side runtime is needed.

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. After the workflow finishes, GitHub will show the published URL in the workflow run and under Pages settings. The Vite configuration uses relative asset paths, so the game works in this nested path.

## Project structure

- `src/levels.ts` contains level data.
- `src/puzzle.ts` contains the grid, movement, reachability, pull/push, and save-state rules.
- `src/main.ts` builds the Three.js scene, camera controls, input, and local progress persistence.
- `src/style.css` contains the page layout and the locally bundled visual treatment.

Progress is saved to the browser's local storage on the current device. The current build contains one level; add additional `LevelDefinition` entries in `src/levels.ts` as the game grows.

Use the view buttons in the upper-right corner to rotate the camera in smooth 15-degree steps, up to 45 degrees to either side. The zoom buttons make small adjustments, and Reset view returns the camera to its starting angle. The sky and foreground are part of the 3D scene, so they shift slightly with the camera. Pom is a rounded 3D character that turns to face the camera.
