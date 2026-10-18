export interface LevelDefinition {
  id: string;
  title: string;
  instructions: string;
  rows: string[];
  palette: Record<string, string>;
  goal: { x: number; y: number };
  floorDepth: number;
  maxPullDepth: number;
  start: { x: number; y: number; z: number };
}

// New levels can be added here as data without changing the movement rules.
export const levels: LevelDefinition[] = [
  {
    id: 'level-01',
    title: 'Pull out a path',
    instructions: 'Bring the blocks toward you, then climb your way to the flag.',
    rows: [
      '...YY...',
      '.BBBYY..',
      'OOBBBOO.',
      'OGGGGOO.',
      'RRGGRRR.',
      'RRRRRRR.',
    ],
    palette: {
      R: '#ff7138',
      O: '#f2a05a',
      G: '#79a66e',
      B: '#55a9ae',
      Y: '#ffdf3f',
    },
    goal: { x: 4, y: 0 },
    floorDepth: 4,
    maxPullDepth: 3,
    start: { x: 0, y: 6, z: 0 },
  },
];
