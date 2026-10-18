import type { LevelDefinition } from './levels';

export interface Cell { x: number; y: number }
export interface Node extends Cell { z: number }
export interface Piece { id: number; color: string; cells: Cell[]; depth: number }
export interface PuzzleState {
  player: Node;
  depths: number[];
  selectedId: number | null;
  won: boolean;
}
export interface Reachability { safe: boolean; destination: Node }

export class Puzzle {
  readonly width: number;
  readonly height: number;
  readonly pieces: Piece[] = [];
  readonly byCell: (Piece | null)[][];
  player: Node;
  selected: Piece | null = null;
  won = false;

  constructor(readonly level: LevelDefinition) {
    this.height = level.rows.length;
    this.width = Math.max(...level.rows.map((row) => row.length));
    this.byCell = Array.from({ length: this.height }, () => Array<Piece | null>(this.width).fill(null));
    this.player = { ...level.start };
    this.createPieces();
  }

  private createPieces(): void {
    const seen = new Set<string>();
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const color = this.level.rows[y]?.[x] ?? '.';
        const origin = `${x},${y}`;
        if (color === '.' || seen.has(origin)) continue;
        const cells: Cell[] = [];
        const queue: Cell[] = [{ x, y }];
        seen.add(origin);
        while (queue.length) {
          const cell = queue.pop()!;
          cells.push(cell);
          for (const [dx, dy] of directions) {
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            const key = `${nx},${ny}`;
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
            if ((this.level.rows[ny]?.[nx] ?? '.') !== color || seen.has(key)) continue;
            seen.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
        const piece: Piece = { id: this.pieces.length, color, cells, depth: 0 };
        this.pieces.push(piece);
        for (const cell of cells) this.byCell[cell.y][cell.x] = piece;
      }
    }
  }

  key(node: Node): string { return `${node.x},${node.y},${node.z}`; }
  pieceAt(x: number, y: number): Piece | null { return this.byCell[y]?.[x] ?? null; }
  cellDepth(x: number, y: number): number {
    if (y === this.height) return 0;
    return this.pieceAt(x, y)?.depth ?? -1;
  }

  nodesAt(x: number, y: number): Node[] {
    if (x < 0 || x >= this.width || y < 0 || y > this.height) return [];
    if (y === this.height) {
      const frontDepth = Math.max(0, this.cellDepth(x, this.height - 1));
      return Array.from({ length: Math.max(0, this.level.floorDepth - frontDepth) }, (_, i) => ({ x, y, z: frontDepth + i }));
    }
    const depth = this.cellDepth(x, y);
    const above = this.cellDepth(x, y - 1);
    if (depth <= 0) return [];
    const nodes: Node[] = [];
    for (let z = Math.max(0, above); z < depth; z++) nodes.push({ x, y, z });
    return nodes;
  }

  validNode(x: number, y: number, z: number): boolean {
    return this.nodesAt(x, y).some((node) => node.z === z);
  }

  goalNode(): Node {
    const piece = this.pieceAt(this.level.goal.x, this.level.goal.y);
    return { ...this.level.goal, z: Math.max(0, (piece?.depth ?? 0) - 1) };
  }

  isGoal(node: Node): boolean { return this.key(node) === this.key(this.goalNode()); }

  neighbors(node: Node): Node[] {
    const out: Node[] = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (Math.abs(dx) + Math.abs(dy) > 2) continue;
      const x = node.x + dx;
      const y = node.y + dy;
      for (const next of this.nodesAt(x, y)) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(next.z - node.z) > 2) continue;
        if (Math.abs(dx) === 2 && this.nodesAt(node.x + Math.sign(dx), node.y).some((mid) => mid.z === node.z)) continue;
        if (this.key(next) !== this.key(node)) out.push(next);
      }
    }
    return out;
  }

  findPath(target: Node): Node[] | null {
    const queue: Node[][] = [[{ ...this.player }]];
    const seen = new Set([this.key(this.player)]);
    while (queue.length) {
      const route = queue.shift()!;
      const node = route[route.length - 1];
      if (this.key(node) === this.key(target)) return route;
      for (const next of this.neighbors(node)) {
        const key = this.key(next);
        if (!seen.has(key)) { seen.add(key); queue.push([...route, next]); }
      }
    }
    return null;
  }

  reachable(): Node[] {
    const out: Node[] = [];
    const queue: Node[] = [{ ...this.player }];
    const seen = new Set([this.key(this.player)]);
    while (queue.length) {
      const node = queue.shift()!;
      for (const next of this.neighbors(node)) {
        const key = this.key(next);
        if (!seen.has(key)) { seen.add(key); out.push(next); queue.push(next); }
      }
    }
    return out;
  }

  standableReachable(): Node[] { return this.reachable().filter((node) => this.validNode(node.x, node.y, node.z)); }

  canReachPiece(piece: Piece): boolean {
    const playerDepth = this.player.z;
    if (this.player.y < this.height && this.pieceAt(this.player.x, this.player.y) === piece && playerDepth < piece.depth) return false;
    return piece.cells.some((cell) => {
      if (this.player.x === cell.x && this.player.y === cell.y + 1 && playerDepth === piece.depth) return true;
      const dx = this.player.x - cell.x;
      if (Math.abs(dx) !== 1 || this.player.y !== cell.y + 1) return false;
      const neighborDepth = this.cellDepth(this.player.x, cell.y);
      return neighborDepth < piece.depth && playerDepth >= Math.max(0, neighborDepth) && playerDepth < piece.depth;
    });
  }

  manipulationLanding(piece: Piece, nextDepth: number, dir: number): Reachability {
    const destination = { ...this.player, z: this.player.z + dir };
    const oldDepth = piece.depth;
    piece.depth = nextDepth;
    const safe = destination.z >= 0 && destination.z < this.level.floorDepth && this.validNode(destination.x, destination.y, destination.z);
    piece.depth = oldDepth;
    return { safe, destination };
  }

  snapshot(): PuzzleState {
    return { player: { ...this.player }, depths: this.pieces.map((piece) => piece.depth), selectedId: this.selected?.id ?? null, won: this.won };
  }

  restore(state: PuzzleState): void {
    if (state.depths.length !== this.pieces.length) return;
    this.player = { ...state.player };
    this.pieces.forEach((piece, i) => { piece.depth = state.depths[i]; });
    this.selected = this.pieces.find((piece) => piece.id === state.selectedId) ?? null;
    this.won = state.won;
  }

  reset(): void {
    this.player = { ...this.level.start };
    this.pieces.forEach((piece) => { piece.depth = 0; });
    this.selected = null;
    this.won = false;
  }
}
