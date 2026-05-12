import { FIELD_COLS, FIELD_ROWS, Field } from './types';

function chainBonus(chain: number): number {
  if (chain <= 1) return 0;
  if (chain === 2) return 8;
  if (chain === 3) return 16;
  if (chain === 4) return 32;
  return 64 * Math.pow(2, chain - 5);
}

function colorBonus(colorCount: number): number {
  const table = [0, 0, 3, 6, 12, 24];
  return table[Math.min(colorCount, 5)];
}

function groupBonus(groupSize: number): number {
  if (groupSize <= 4) return 0;
  if (groupSize <= 10) return groupSize - 4;
  return 10;
}

export function calculateScore(
  field: Field,
  clearingCells: ReadonlySet<number>,
  chain: number,
): number {
  if (clearingCells.size === 0) return 0;

  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  const colorSet = new Set<string>();
  const visited = new Set<number>();
  let totalGroupBonus = 0;

  for (const encoded of clearingCells) {
    if (visited.has(encoded)) continue;
    const startR = Math.floor(encoded / FIELD_COLS);
    const startC = encoded % FIELD_COLS;
    const color = field[startR][startC];
    if (!color || color === 'ojama') continue;

    colorSet.add(color);
    const groupQueue = [encoded];
    visited.add(encoded);
    let groupSize = 0;

    while (groupQueue.length > 0) {
      const enc = groupQueue.shift()!;
      groupSize++;
      const r = Math.floor(enc / FIELD_COLS);
      const c = enc % FIELD_COLS;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < FIELD_ROWS && nc >= 0 && nc < FIELD_COLS) {
          const ne = nr * FIELD_COLS + nc;
          if (!visited.has(ne) && clearingCells.has(ne) && field[nr][nc] === color) {
            visited.add(ne);
            groupQueue.push(ne);
          }
        }
      }
    }

    totalGroupBonus += groupBonus(groupSize);
  }

  const multiplier = Math.max(1, chainBonus(chain) + colorBonus(colorSet.size) + totalGroupBonus);
  return clearingCells.size * 10 * multiplier;
}

export function ojamaSent(chain: number): number {
  const table = [0, 0, 1, 2, 4, 6, 8, 10];
  if (chain < table.length) return table[chain];
  return table[table.length - 1] + (chain - table.length + 1) * 2;
}
