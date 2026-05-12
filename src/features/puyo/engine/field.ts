import {
  FIELD_COLS,
  FIELD_ROWS,
  SPAWN_COL,
  SPAWN_ROW,
  PUYO_COLORS,
  PuyoColor,
  ColorPuyo,
  Field,
  Pair,
  Rotation,
} from './types';

export function createEmptyField(): Field {
  return Array.from({ length: FIELD_ROWS }, () =>
    Array.from<PuyoColor>({ length: FIELD_COLS }).fill(null),
  );
}

export function getSubOffset(rotation: Rotation): { dr: number; dc: number } {
  const offsets = [
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
  ] as const;
  return offsets[rotation];
}

export function getSubPosition(pair: Pair): { row: number; col: number } {
  const { dr, dc } = getSubOffset(pair.rotation);
  return { row: pair.axisRow + dr, col: pair.axisCol + dc };
}

function occupied(field: Field, row: number, col: number): boolean {
  if (col < 0 || col >= FIELD_COLS) return true;
  if (row >= FIELD_ROWS) return true;
  if (row < 0) return false; // above the field is free
  return field[row][col] !== null;
}

export function canPlacePair(field: Field, pair: Pair): boolean {
  if (pair.axisCol < 0 || pair.axisCol >= FIELD_COLS) return false;
  const sub = getSubPosition(pair);
  if (sub.col < 0 || sub.col >= FIELD_COLS) return false;
  return !occupied(field, pair.axisRow, pair.axisCol) && !occupied(field, sub.row, sub.col);
}

export function tryMovePair(field: Field, pair: Pair, dc: number, dr: number): Pair | null {
  const moved = { ...pair, axisRow: pair.axisRow + dr, axisCol: pair.axisCol + dc };
  return canPlacePair(field, moved) ? moved : null;
}

export function rotatePair(field: Field, pair: Pair, clockwise: boolean): Pair {
  const dir = clockwise ? 1 : 3;
  const newRot = ((pair.rotation + dir) % 4) as Rotation;
  const rotated = { ...pair, rotation: newRot };

  if (canPlacePair(field, rotated)) return rotated;

  // Wall kick: try shifting horizontally
  for (const dc of [-1, 1]) {
    const kicked = { ...rotated, axisCol: rotated.axisCol + dc };
    if (canPlacePair(field, kicked)) return kicked;
  }

  // Lift kick: try moving axis up (handles sub-below case)
  const lifted = { ...rotated, axisRow: rotated.axisRow - 1 };
  if (canPlacePair(field, lifted)) return lifted;

  return pair; // rotation not possible
}

export function lockPair(field: Field, pair: Pair): Field {
  const next = field.map((row) => [...row]) as PuyoColor[][];
  const place = (r: number, c: number, color: PuyoColor) => {
    if (r >= 0 && r < FIELD_ROWS && c >= 0 && c < FIELD_COLS) next[r][c] = color;
  };
  place(pair.axisRow, pair.axisCol, pair.axisColor);
  const sub = getSubPosition(pair);
  place(sub.row, sub.col, pair.subColor);
  return next;
}

export function applyGravity(field: Field): Field {
  const next = field.map((row) => [...row]) as PuyoColor[][];
  for (let col = 0; col < FIELD_COLS; col++) {
    let writeRow = FIELD_ROWS - 1;
    for (let row = FIELD_ROWS - 1; row >= 0; row--) {
      if (next[row][col] !== null) {
        if (row !== writeRow) {
          next[writeRow][col] = next[row][col];
          next[row][col] = null;
        }
        writeRow--;
      }
    }
  }
  return next;
}

function encode(row: number, col: number): number {
  return row * FIELD_COLS + col;
}

export function findClearingCells(field: Field): Set<number> {
  const visited = new Set<number>();
  const colorGroups: Array<Array<[number, number]>> = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  for (let row = 0; row < FIELD_ROWS; row++) {
    for (let col = 0; col < FIELD_COLS; col++) {
      const color = field[row][col];
      if (!color || color === 'ojama' || visited.has(encode(row, col))) continue;

      const group: Array<[number, number]> = [];
      const queue: Array<[number, number]> = [[row, col]];
      visited.add(encode(row, col));

      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        group.push([r, c]);
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < FIELD_ROWS &&
            nc >= 0 &&
            nc < FIELD_COLS &&
            !visited.has(encode(nr, nc)) &&
            field[nr][nc] === color
          ) {
            visited.add(encode(nr, nc));
            queue.push([nr, nc]);
          }
        }
      }

      if (group.length >= 4) colorGroups.push(group);
    }
  }

  const toRemove = new Set<number>();
  for (const group of colorGroups) {
    for (const [r, c] of group) toRemove.add(encode(r, c));
  }

  // Remove adjacent ojama puyos
  for (const encoded of [...toRemove]) {
    const r = Math.floor(encoded / FIELD_COLS);
    const c = encoded % FIELD_COLS;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < FIELD_ROWS && nc >= 0 && nc < FIELD_COLS && field[nr][nc] === 'ojama') {
        toRemove.add(encode(nr, nc));
      }
    }
  }

  return toRemove;
}

export function clearCells(field: Field, cells: ReadonlySet<number>): Field {
  const next = field.map((row) => [...row]) as PuyoColor[][];
  for (const encoded of cells) {
    next[Math.floor(encoded / FIELD_COLS)][encoded % FIELD_COLS] = null;
  }
  return next;
}

export function dropOjama(field: Field, count: number): Field {
  const next = field.map((row) => [...row]) as PuyoColor[][];
  let placed = 0;
  // Spread ojama across columns in random order
  const cols = [...Array(FIELD_COLS).keys()].sort(() => Math.random() - 0.5);
  for (const col of cols) {
    if (placed >= count) break;
    if (next[0][col] === null) {
      next[0][col] = 'ojama';
      placed++;
    }
  }
  return next;
}

export function randomColor(): ColorPuyo {
  return PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)];
}

export function createRandomPair(): Pair {
  return {
    axisColor: randomColor(),
    subColor: randomColor(),
    axisRow: SPAWN_ROW,
    axisCol: SPAWN_COL,
    rotation: 0,
  };
}

export function getGhostPair(field: Field, pair: Pair): Pair {
  let ghost = pair;
  for (;;) {
    const next = tryMovePair(field, ghost, 0, 1);
    if (!next) return ghost;
    ghost = next;
  }
}

export function isSpawnBlocked(field: Field): boolean {
  return field[SPAWN_ROW][SPAWN_COL] !== null;
}
