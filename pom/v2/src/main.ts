import * as THREE from 'three';
import './style.css';
import { levels, type LevelDefinition } from './levels';
import { Puzzle, type Node, type Piece, type PuzzleState } from './puzzle';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $('board') as HTMLCanvasElement;
const wrap = $('canvasWrap');
const levelSelect = $('levelSelect') as HTMLSelectElement;
const toast = $('toast');
const colors = (level: LevelDefinition, color: string) => level.palette[color] ?? '#d9d2bd';
const ink = 0x28251f;

interface SavedProgress {
  version: 1;
  currentLevelId: string;
  completedLevelIds: string[];
  states: Record<string, PuzzleState>;
}
const saveKey = 'pom.progress.v1';
const readProgress = (): SavedProgress => {
  try {
    const parsed = JSON.parse(localStorage.getItem(saveKey) ?? 'null') as Partial<SavedProgress> | null;
    if (parsed?.version === 1 && Array.isArray(parsed.completedLevelIds) && parsed.states) {
      return {
        version: 1,
        currentLevelId: typeof parsed.currentLevelId === 'string' ? parsed.currentLevelId : levels[0].id,
        completedLevelIds: parsed.completedLevelIds.filter((id): id is string => typeof id === 'string'),
        states: parsed.states,
      };
    }
  } catch { /* Ignore malformed or unavailable local saves. */ }
  return { version: 1, currentLevelId: levels[0].id, completedLevelIds: [], states: {} };
};
let progress = readProgress();
let level = levels.find((item) => item.id === progress.currentLevelId) ?? levels[0];
let puzzle = new Puzzle(level);
let moveHistory: PuzzleState[] = [];
let busy = false;
let toastTimer = 0;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
const target = new THREE.Vector3(puzzle.width / 2 - 0.5, 0, 1.7);
camera.up.set(0, 1, 0);
camera.position.set(target.x + 4, target.y + 4.3, target.z + 15);
camera.lookAt(target);
let cameraAngle = 0;
let targetCameraAngle = 0;
let cameraZoom = 1;
let targetCameraZoom = 1;

scene.add(new THREE.HemisphereLight(0xfff5df, 0x66744f, 2.25));
const sun = new THREE.DirectionalLight(0xfff2d1, 2.25);
sun.position.set(-5, 9, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -8;
sun.shadow.bias = -0.001;
scene.add(sun);

const staticMeshes: THREE.Object3D[] = [];
const blockMeshes: THREE.Mesh[] = [];
const landingMeshes: THREE.Mesh[] = [];
let playerActor: THREE.Group;
let flagGroup: THREE.Group;
let backdropGroup: THREE.Group;
let motion: { from: Node; to: Node; start: number; duration: number; jump: boolean; done: () => void } | null = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart: { x: number; y: number } | null = null;
let lastToast = '';

function nodePosition(node: Node): THREE.Vector3 {
  return new THREE.Vector3(node.x + 0.5, puzzle.height / 2 - node.y, node.z + 0.5);
}

function showToast(message: string): void {
  if (lastToast === message && toast.classList.contains('on')) return;
  lastToast = message;
  toast.textContent = message;
  toast.classList.add('on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('on'), 1600);
}

function addBackdrop(): void {
  if (backdropGroup) {
    scene.remove(backdropGroup);
    backdropGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
  }
  backdropGroup = new THREE.Group();
  backdropGroup.position.set(puzzle.width / 2 - 0.5, 0, -7);
  const loader = new THREE.TextureLoader();
  const width = 42;
  const height = width / 3;
  const sky = loader.load(new URL('../sky-background.png', import.meta.url).href);
  sky.colorSpace = THREE.SRGBColorSpace;
  const meadow = loader.load(new URL('../meadow-foreground.png', import.meta.url).href);
  meadow.colorSpace = THREE.SRGBColorSpace;
  const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: sky, side: THREE.DoubleSide, toneMapped: false }),
  );
  skyPlane.position.z = -0.04;
  const meadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: meadow, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
  );
  meadowPlane.position.z = 0.005;
  backdropGroup.add(skyPlane, meadowPlane);
  scene.add(backdropGroup);
}

function addBoard(): void {
  for (const child of staticMeshes) {
    scene.remove(child);
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material.dispose();
    }
  }
  staticMeshes.length = 0;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(puzzle.width + 0.12, puzzle.height + 0.12, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xb4c598, roughness: 1 }),
  );
  board.position.set(puzzle.width / 2, 0, -0.085);
  board.receiveShadow = true;
  scene.add(board);
  staticMeshes.push(board);

  const gridPoints: THREE.Vector3[] = [];
  for (let x = 0; x <= puzzle.width; x++) {
    gridPoints.push(new THREE.Vector3(x, puzzle.height / 2, 0.002), new THREE.Vector3(x, -puzzle.height / 2, 0.002));
  }
  for (let y = 0; y <= puzzle.height; y++) {
    const worldY = puzzle.height / 2 - y;
    gridPoints.push(new THREE.Vector3(0, worldY, 0.002), new THREE.Vector3(puzzle.width, worldY, 0.002));
  }
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPoints), new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.22 }));
  scene.add(grid);
  staticMeshes.push(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(puzzle.width + 1.2, level.floorDepth + 1.1),
    new THREE.MeshStandardMaterial({ color: 0x9db07a, roughness: 1, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(puzzle.width / 2, -puzzle.height / 2 - 0.08, 1.55);
  floor.receiveShadow = true;
  scene.add(floor);
  staticMeshes.push(floor);
}

function makePlayer(): void {
  if (playerActor) {
    scene.remove(playerActor);
    playerActor.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
  }
  playerActor = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 20),
    new THREE.MeshStandardMaterial({ color: 0xef5941, roughness: 0.48, metalness: 0 }),
  );
  body.scale.set(0.31, 0.39, 0.27);
  body.position.y = 0.39;
  body.castShadow = true;
  body.receiveShadow = true;
  playerActor.add(body);

  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xfff0d8, roughness: 0.32 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.35 });
  for (const x of [-0.105, 0.105]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.071, 14, 12), eyeWhite);
    eye.position.set(x, 0.49, 0.212);
    eye.castShadow = true;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), pupilMat);
    pupil.position.set(x + 0.006, 0.49, 0.275);
    playerActor.add(eye, pupil);
  }
  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.055, 0.285, 0.258),
    new THREE.Vector3(0, 0.255, 0.284),
    new THREE.Vector3(0.055, 0.285, 0.258),
  );
  const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 10, 0.009, 6, false), pupilMat);
  playerActor.add(smile);
  scene.add(playerActor);
  placePlayer(puzzle.player);
}

function placePlayer(node: Node, jumpHeight = 0): void {
  const position = nodePosition(node);
  playerActor.position.set(position.x, position.y + jumpHeight, position.z);
  playerActor.rotation.y = Math.atan2(camera.position.x - position.x, camera.position.z - position.z);
}

function addFlag(): void {
  if (flagGroup) {
    scene.remove(flagGroup);
    flagGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });
  }
  flagGroup = new THREE.Group();
  const goal = puzzle.goalNode();
  const position = nodePosition(goal);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 8), new THREE.MeshStandardMaterial({ color: ink, roughness: 1 }));
  pole.position.set(position.x, position.y + 0.38, position.z);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.72); shape.lineTo(0.42, 0.61); shape.lineTo(0, 0.48); shape.closePath();
  const pennant = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xff7138, side: THREE.DoubleSide }));
  pennant.position.set(position.x + 0.012, position.y, position.z + 0.026);
  flagGroup.add(pole, pennant);
  flagGroup.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.userData.isFlag = true; } });
  scene.add(flagGroup);
}

function clearMeshes(meshes: THREE.Mesh[]): void {
  for (const mesh of meshes) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
    else mesh.material.dispose();
  }
  meshes.length = 0;
}

function displayColor(piece: Piece): number {
  const base = new THREE.Color(colors(level, piece.color));
  const reachable = puzzle.canReachPiece(piece);
  if (piece.id === puzzle.selected?.id) base.lerp(new THREE.Color('#fff0a6'), 0.35);
  else if (reachable) base.lerp(new THREE.Color('#fff0a6'), 0.14);
  return base.getHex();
}

function rebuildBlocks(): void {
  clearMeshes(blockMeshes);
  for (const piece of puzzle.pieces) {
    const frontColor = displayColor(piece);
    const sideColor = new THREE.Color(frontColor).multiplyScalar(0.73).getHex();
    const topColor = new THREE.Color(frontColor).lerp(new THREE.Color('#fff1c6'), 0.34).getHex();
    const materials = [
      new THREE.MeshStandardMaterial({ color: sideColor, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: sideColor, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: topColor, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: sideColor, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: frontColor, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: sideColor, roughness: 1 }),
    ];
    for (const cell of piece.cells) {
      const depth = Math.max(piece.depth + 0.06, 0.06);
      const geometry = new THREE.BoxGeometry(0.98, 0.98, depth);
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.position.set(cell.x + 0.5, puzzle.height / 2 - cell.y - 0.5, piece.depth > 0 ? piece.depth / 2 + 0.03 : 0.03);
      mesh.castShadow = piece.depth > 0;
      mesh.receiveShadow = true;
      mesh.userData.pieceId = piece.id;
      scene.add(mesh);
      blockMeshes.push(mesh);

      const edgeGeometry = new THREE.EdgesGeometry(geometry, 1);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: piece.id === puzzle.selected?.id ? 0xb94d29 : ink, transparent: true, opacity: 0.9 });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.copy(mesh.position);
      edges.userData.pieceId = piece.id;
      edges.raycast = () => undefined;
      scene.add(edges);
      blockMeshes.push(edges as unknown as THREE.Mesh);
    }
  }
}

function clearLandings(): void { clearMeshes(landingMeshes); }

function rebuildLandings(): void {
  clearLandings();
  for (const node of puzzle.standableReachable()) {
    const marker = new THREE.Mesh(
      new THREE.CircleGeometry(0.17, 24),
      new THREE.MeshBasicMaterial({ color: 0xffefac, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    marker.rotation.x = -Math.PI / 2;
    const position = nodePosition(node);
    marker.position.set(position.x, position.y + 0.018, position.z);
    marker.renderOrder = 2;
    marker.userData.node = node;
    scene.add(marker);
    landingMeshes.push(marker);
  }
}

function updateControls(): void {
  const piece = puzzle.selected;
  const reachable = Boolean(piece && puzzle.canReachPiece(piece));
  const canPull = Boolean(piece && reachable && piece.depth < level.maxPullDepth && puzzle.manipulationLanding(piece, piece.depth + 1, 1).safe);
  const canPush = Boolean(piece && reachable && piece.depth > 0 && puzzle.manipulationLanding(piece, piece.depth - 1, -1).safe);
  $('push').toggleAttribute('disabled', busy || !canPush || puzzle.won);
  $('pull').toggleAttribute('disabled', busy || !canPull || puzzle.won);
  $('undo').toggleAttribute('disabled', busy || moveHistory.length === 0);
  $('reset').toggleAttribute('disabled', busy);
  levelSelect.toggleAttribute('disabled', busy);
}

function updateProgress(): void {
  progress.currentLevelId = level.id;
  progress.states[level.id] = puzzle.snapshot();
  try { localStorage.setItem(saveKey, JSON.stringify(progress)); }
  catch { showToast('Progress could not be saved on this device.'); }
}

function saveSnapshot(state: PuzzleState): void { moveHistory.push(state); }

function saveCurrentLevel(): void { updateProgress(); }

function applySavedState(game: Puzzle): void {
  const state = progress.states[game.level.id];
  if (!state || !Array.isArray(state.depths) || state.depths.length !== game.pieces.length) return;
  if (!state.depths.every((depth) => Number.isInteger(depth) && depth >= 0 && depth <= game.level.maxPullDepth)) return;
  game.restore(state);
  if (!game.validNode(game.player.x, game.player.y, game.player.z)) game.reset();
}

function updateLevelText(): void {
  const index = levels.findIndex((item) => item.id === level.id);
  $('levelNumber').textContent = String(index + 1).padStart(2, '0');
  $('levelTitle').textContent = level.title;
  $('levelInstructions').textContent = level.instructions;
  document.title = `Pom — ${level.title}`;
}

function populateLevelSelect(): void {
  levelSelect.replaceChildren();
  levels.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `Level ${String(index + 1).padStart(2, '0')}`;
    levelSelect.append(option);
  });
  levelSelect.value = level.id;
}

function rebuildWorld(): void {
  addBackdrop();
  addBoard();
  addFlag();
  makePlayer();
  rebuildBlocks();
  rebuildLandings();
  updateControls();
  updateLevelText();
}

function selectPiece(piece: Piece | null): void {
  puzzle.selected = piece;
  rebuildBlocks();
  updateControls();
  if (piece) showToast(puzzle.canReachPiece(piece) ? 'Block selected. Pull or push it from here.' : 'That block is too far away to reach.');
}

function moveByDirection(dx: number, dy: number): void {
  const options = puzzle.standableReachable().map((node) => {
    const x = node.x - puzzle.player.x;
    const y = node.y - puzzle.player.y;
    const main = dx ? x * dx : y * dy;
    const cross = dx ? Math.abs(y) : Math.abs(x);
    return { node, main, cross, depth: Math.abs(node.z - puzzle.player.z) };
  }).filter((option) => option.main > 0 && option.cross <= option.main);
  options.sort((a, b) => (a.main * 4 + a.cross * 2 + a.depth) - (b.main * 4 + b.cross * 2 + b.depth));
  if (options[0]) void moveTo(options[0].node);
  else showToast('No reachable ledge in that direction.');
}

function selectNearestReachablePiece(): void {
  const candidates = puzzle.pieces.filter((piece) => puzzle.canReachPiece(piece));
  if (!candidates.length) { showToast('Move Pom beside a block to select it.'); return; }
  const currentIndex = candidates.findIndex((piece) => piece.id === puzzle.selected?.id);
  const next = candidates[(currentIndex + 1) % candidates.length];
  selectPiece(next);
}

function onBoardKey(event: KeyboardEvent): void {
  const directions: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  };
  const direction = directions[event.key];
  if (direction) {
    event.preventDefault();
    moveByDirection(direction[0], direction[1]);
  } else if (event.key.toLowerCase() === 'e') {
    event.preventDefault();
    selectNearestReachablePiece();
  } else if (event.key === 'Escape') {
    selectPiece(null);
  }
}

function animateEdge(from: Node, to: Node): Promise<void> {
  return new Promise((resolve) => {
    motion = { from, to, start: performance.now(), duration: Math.abs(to.x - from.x) > 1 || to.y !== from.y ? 270 : 180, jump: Math.abs(to.x - from.x) > 1 || to.y !== from.y, done: resolve };
  });
}

async function moveTo(targetNode: Node): Promise<void> {
  if (busy || puzzle.won) return;
  const path = puzzle.findPath(targetNode);
  if (!path || path.length < 2) { showToast('That ledge is out of reach. Pull a block out to make a step.'); return; }
  saveSnapshot(puzzle.snapshot());
  busy = true;
  updateControls();
  for (let i = 1; i < path.length; i++) await animateEdge(path[i - 1], path[i]);
  busy = false;
  if (puzzle.isGoal(targetNode)) {
    puzzle.won = true;
    if (!progress.completedLevelIds.includes(level.id)) progress.completedLevelIds.push(level.id);
    showToast('Pom made it to the flag!');
    $('levelTitle').classList.add('win');
  } else showToast('Pom made it to that ledge.');
  updateProgress();
  rebuildLandings();
  updateControls();
}

function pull(dir: 1 | -1): void {
  const piece = puzzle.selected;
  if (!piece || busy || puzzle.won || !puzzle.canReachPiece(piece)) return;
  const nextDepth = piece.depth + dir;
  if (nextDepth < 0 || nextDepth > level.maxPullDepth) {
    showToast(dir > 0 ? 'This block is all the way out.' : 'This block is flush with the wall.');
    return;
  }
  const landing = puzzle.manipulationLanding(piece, nextDepth, dir);
  if (!landing.safe) { showToast('Pom has no safe standing spot to move with this piece.'); return; }
  saveSnapshot(puzzle.snapshot());
  piece.depth = nextDepth;
  puzzle.player = landing.destination;
  rebuildBlocks();
  rebuildLandings();
  placePlayer(puzzle.player);
  updateProgress();
  updateControls();
  showToast(dir > 0 ? `Pulled ${nextDepth} step${nextDepth === 1 ? '' : 's'} out.` : 'Pushed one step back.');
}

function restore(state: PuzzleState): void {
  puzzle.restore(state);
  $('levelTitle').classList.toggle('win', puzzle.won);
  rebuildBlocks();
  rebuildLandings();
  placePlayer(puzzle.player);
  updateProgress();
  updateControls();
}

function worldClick(event: PointerEvent): void {
  if (!pointerStart || busy || puzzle.won) { pointerStart = null; return; }
  const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (distance > 5) return;
  const rect = canvas.getBoundingClientRect();
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const landing = raycaster.intersectObjects(landingMeshes, false)[0]?.object as THREE.Mesh | undefined;
  if (landing?.userData.node) { void moveTo(landing.userData.node as Node); return; }
  const block = raycaster.intersectObjects(blockMeshes, false).find((hit) => typeof hit.object.userData.pieceId === 'number');
  if (block) {
    const piece = puzzle.pieces[block.object.userData.pieceId as number];
    if (piece) selectPiece(piece);
    return;
  }
  selectPiece(null);
}

function resize(): void {
  const width = Math.max(1, wrap.clientWidth);
  const height = Math.max(1, wrap.clientHeight);
  const aspect = width / height;
  const viewHeight = 9.2;
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function resetCamera(): void {
  targetCameraAngle = 0;
  targetCameraZoom = 1;
  updateViewButtons();
  $('viewStatus').textContent = 'Camera view reset.';
}

function updateViewButtons(): void {
  $('turnLeft').toggleAttribute('disabled', targetCameraAngle <= -Math.PI / 4 + 0.001);
  $('turnRight').toggleAttribute('disabled', targetCameraAngle >= Math.PI / 4 - 0.001);
  $('zoomOut').toggleAttribute('disabled', targetCameraZoom <= 0.82 + 0.001);
  $('zoomIn').toggleAttribute('disabled', targetCameraZoom >= 1.28 - 0.001);
}

function rotateView(direction: -1 | 1): void {
  targetCameraAngle = THREE.MathUtils.clamp(targetCameraAngle + direction * Math.PI / 12, -Math.PI / 4, Math.PI / 4);
  const degrees = Math.round(targetCameraAngle * 180 / Math.PI);
  $('viewStatus').textContent = degrees === 0 ? 'View centered.' : `View rotated ${Math.abs(degrees)} degrees ${degrees < 0 ? 'left' : 'right'}.`;
  updateViewButtons();
}

function zoomView(direction: -1 | 1): void {
  targetCameraZoom = THREE.MathUtils.clamp(targetCameraZoom + direction * 0.12, 0.82, 1.28);
  updateViewButtons();
}

function startLevel(id: string): void {
  const nextLevel = levels.find((item) => item.id === id);
  if (!nextLevel) return;
  saveCurrentLevel();
  level = nextLevel;
  puzzle = new Puzzle(level);
  applySavedState(puzzle);
  moveHistory = [];
  target.set(puzzle.width / 2 - 0.5, 0, 1.7);
  cameraAngle = targetCameraAngle = 0;
  cameraZoom = targetCameraZoom = 1;
  updateViewButtons();
  progress.currentLevelId = id;
  rebuildWorld();
  saveCurrentLevel();
}

function resetPuzzle(): void {
  if (busy) return;
  puzzle.reset();
  moveHistory = [];
  $('levelTitle').classList.remove('win');
  rebuildBlocks();
  rebuildLandings();
  placePlayer(puzzle.player);
  updateProgress();
  updateControls();
  showToast('Puzzle reset.');
}

function frame(now: number): void {
  cameraAngle += (targetCameraAngle - cameraAngle) * 0.12;
  cameraZoom += (targetCameraZoom - cameraZoom) * 0.12;
  if (Math.abs(targetCameraAngle - cameraAngle) < 0.0005) cameraAngle = targetCameraAngle;
  if (Math.abs(targetCameraZoom - cameraZoom) < 0.0005) cameraZoom = targetCameraZoom;
  camera.position.set(
    target.x + Math.sin(cameraAngle) * 15,
    target.y + 4.3,
    target.z + Math.cos(cameraAngle) * 15,
  );
  camera.zoom = cameraZoom;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  if (backdropGroup) backdropGroup.rotation.y = cameraAngle * 0.22;
  let jump = 0;
  if (motion) {
    const t = Math.min(1, (now - motion.start) / motion.duration);
    const eased = t * (2 - t);
    const node = {
      x: motion.from.x + (motion.to.x - motion.from.x) * eased,
      y: motion.from.y + (motion.to.y - motion.from.y) * eased,
      z: motion.from.z + (motion.to.z - motion.from.z) * eased,
    };
    if (motion.jump) jump = Math.sin(Math.PI * t) * 0.42;
    placePlayer(node, jump);
    if (t >= 1) {
      const finished = motion;
      puzzle.player = { ...finished.to };
      motion = null;
      finished.done();
    }
  } else placePlayer(puzzle.player);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function initialize(): void {
  populateLevelSelect();
  applySavedState(puzzle);
  rebuildWorld();
  updateViewButtons();
  resize();
  updateProgress();
  new ResizeObserver(resize).observe(wrap);
  canvas.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointerup', worldClick);
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  canvas.addEventListener('keydown', onBoardKey);
  $('pull').addEventListener('click', () => pull(1));
  $('push').addEventListener('click', () => pull(-1));
  $('undo').addEventListener('click', () => {
    if (busy) return;
    const previous = moveHistory.pop();
    if (previous) restore(previous); else showToast('Nothing to undo yet.');
  });
  $('reset').addEventListener('click', resetPuzzle);
  $('resetView').addEventListener('click', resetCamera);
  $('turnLeft').addEventListener('click', () => rotateView(-1));
  $('turnRight').addEventListener('click', () => rotateView(1));
  $('zoomOut').addEventListener('click', () => zoomView(-1));
  $('zoomIn').addEventListener('click', () => zoomView(1));
  levelSelect.addEventListener('change', () => startLevel(levelSelect.value));
  requestAnimationFrame(frame);
}

initialize();
