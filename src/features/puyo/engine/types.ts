export const FIELD_COLS = 6;
export const FIELD_ROWS = 13; // row 0 is hidden spawn row
export const SPAWN_COL = 2;
export const SPAWN_ROW = 1;

export const PUYO_COLORS = ['red', 'green', 'blue', 'yellow', 'purple'] as const;
export type ColorPuyo = (typeof PUYO_COLORS)[number];
export type PuyoColor = ColorPuyo | 'ojama' | null;

export type Field = ReadonlyArray<ReadonlyArray<PuyoColor>>;

// 0=sub above, 1=sub right, 2=sub below, 3=sub left
export type Rotation = 0 | 1 | 2 | 3;

export type Pair = {
  axisColor: ColorPuyo;
  subColor: ColorPuyo;
  axisRow: number;
  axisCol: number;
  rotation: Rotation;
};

export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'locking'
  | 'clearing'
  | 'gameover';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DROP_INTERVALS: Record<Difficulty, number> = {
  easy: 800,
  normal: 500,
  hard: 300,
};

export const LOCK_DELAY = 500;
export const CLEAR_DELAY = 400;

export type GameState = {
  field: Field;
  currentPair: Pair | null;
  nextPairs: [Pair, Pair];
  score: number;
  chain: number;
  ojamaPending: number;
  phase: GamePhase;
  difficulty: Difficulty;
  clearingCells: ReadonlySet<number>; // encoded as row * FIELD_COLS + col
  lastDropTime: number;
  lockStartTime: number;
  clearStartTime: number;
};
