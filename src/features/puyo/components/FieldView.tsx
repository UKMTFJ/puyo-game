'use client';

import { Field, PuyoColor, Pair, FIELD_COLS, FIELD_ROWS } from '../engine/types';
import { getSubPosition, getGhostPair } from '../engine/field';

const CELL = 40;
const VISIBLE_ROWS = FIELD_ROWS - 1;
const BRIDGE_THICKNESS = 14;

const COLOR: Record<NonNullable<PuyoColor>, string> = {
  red: '#f87171',
  green: '#4ade80',
  blue: '#3b82f6',
  yellow: '#facc15',
  purple: '#9333ea',
  ojama: '#9ca3af',
};

const HIGHLIGHT: Record<NonNullable<PuyoColor>, string> = {
  red: '#fca5a5',
  green: '#86efac',
  blue: '#60a5fa',
  yellow: '#fde047',
  purple: '#c084fc',
  ojama: '#d1d5db',
};

function PuyoCircle({
  color,
  clearing,
  ghost,
}: {
  color: NonNullable<PuyoColor>;
  clearing?: boolean;
  ghost?: boolean;
}) {
  const base = COLOR[color];
  return (
    <div
      style={{
        width: CELL - 6,
        height: CELL - 6,
        borderRadius: '50%',
        background: ghost
          ? 'transparent'
          : `radial-gradient(circle at 35% 35%, ${HIGHLIGHT[color]}, ${base})`,
        border: ghost ? `3px solid ${base}` : `2px solid rgba(0,0,0,0.25)`,
        opacity: clearing ? 0.4 : ghost ? 0.4 : 1,
        boxShadow: clearing ? `0 0 14px ${base}` : ghost ? 'none' : `inset 0 -3px 4px rgba(0,0,0,0.2)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        color: 'rgba(0,0,0,0.6)',
        fontWeight: 700,
        transition: 'opacity 0.1s',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {color !== 'ojama' && !ghost && (
        <>
          <div style={{
            position: 'absolute', width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            top: '30%', left: '24%',
            boxShadow: 'inset 1px 1px 0 rgba(0,0,0,0.7)',
          }} />
          <div style={{
            position: 'absolute', width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            top: '30%', left: '55%',
            boxShadow: 'inset 1px 1px 0 rgba(0,0,0,0.7)',
          }} />
          <div style={{
            position: 'absolute', width: 12, height: 6,
            border: '2px solid rgba(0,0,0,0.55)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            bottom: '22%', left: '50%',
            transform: 'translateX(-50%)',
          }} />
        </>
      )}
      {color === 'ojama' && '✕'}
    </div>
  );
}

type Props = {
  field: Field;
  currentPair: Pair | null;
  clearingCells: ReadonlySet<number>;
};

type Connections = { top: boolean; bottom: boolean; left: boolean; right: boolean };
type CellData = {
  color: NonNullable<PuyoColor>;
  clearing: boolean;
  ghost: boolean;
  connections: Connections;
} | null;

const NO_CONNECTIONS: Connections = { top: false, bottom: false, left: false, right: false };

export function FieldView({ field, currentPair, clearingCells }: Props) {
  // Build display grid (visible rows only: 1..12)
  const grid: CellData[][] = Array.from({ length: VISIBLE_ROWS }, (_, vr) => {
    const fieldRow = vr + 1;
    return Array.from({ length: FIELD_COLS }, (_, c) => {
      const color = field[fieldRow][c];
      if (!color) return null;
      const enc = fieldRow * FIELD_COLS + c;
      return { color, clearing: clearingCells.has(enc), ghost: false, connections: { ...NO_CONNECTIONS } };
    });
  });

  // Overlay ghost
  if (currentPair) {
    const ghost = getGhostPair(field, currentPair);
    const ghostPositions = [
      { row: ghost.axisRow, col: ghost.axisCol },
      getSubPosition(ghost),
    ];
    const pairPositions = new Set([
      `${currentPair.axisRow},${currentPair.axisCol}`,
      `${getSubPosition(currentPair).row},${getSubPosition(currentPair).col}`,
    ]);
    for (const { row, col } of ghostPositions) {
      const vr = row - 1;
      if (vr >= 0 && vr < VISIBLE_ROWS && col >= 0 && col < FIELD_COLS && !grid[vr][col]) {
        const pairKey = `${row},${col}`;
        if (!pairPositions.has(pairKey)) {
          grid[vr][col] = { color: currentPair.axisColor, clearing: false, ghost: true, connections: { ...NO_CONNECTIONS } };
        }
      }
    }
  }

  // Overlay current pair
  if (currentPair) {
    const positions = [
      { row: currentPair.axisRow, col: currentPair.axisCol, color: currentPair.axisColor },
      { ...getSubPosition(currentPair), color: currentPair.subColor },
    ];
    for (const { row, col, color } of positions) {
      const vr = row - 1;
      if (vr >= 0 && vr < VISIBLE_ROWS && col >= 0 && col < FIELD_COLS) {
        grid[vr][col] = { color, clearing: false, ghost: false, connections: { ...NO_CONNECTIONS } };
      }
    }
  }

  // Compute same-color connections (color puyos only, no ghost, no ojama)
  for (let vr = 0; vr < VISIBLE_ROWS; vr++) {
    for (let c = 0; c < FIELD_COLS; c++) {
      const cell = grid[vr][c];
      if (!cell || cell.ghost || cell.color === 'ojama') continue;
      const same = (other: CellData) =>
        other != null && !other.ghost && other.color === cell.color;
      cell.connections = {
        top:    vr > 0              && same(grid[vr - 1][c]),
        bottom: vr < VISIBLE_ROWS-1 && same(grid[vr + 1][c]),
        left:   c > 0               && same(grid[vr][c - 1]),
        right:  c < FIELD_COLS-1    && same(grid[vr][c + 1]),
      };
    }
  }

  const bridgeOffset = (CELL - BRIDGE_THICKNESS) / 2;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${FIELD_COLS}, ${CELL}px)`,
        gridTemplateRows: `repeat(${VISIBLE_ROWS}, ${CELL}px)`,
        border: '2px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.45)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {grid.map((row, vr) =>
        row.map((cell, c) => (
          <div
            key={`${vr}-${c}`}
            style={{
              width: CELL,
              height: CELL,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: c < FIELD_COLS - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              borderBottom: vr < VISIBLE_ROWS - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            {cell && !cell.ghost && cell.color !== 'ojama' && (
              <>
                {cell.connections.top && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: bridgeOffset,
                    width: BRIDGE_THICKNESS, height: CELL / 2,
                    background: COLOR[cell.color],
                    opacity: cell.clearing ? 0.4 : 1,
                  }} />
                )}
                {cell.connections.bottom && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: bridgeOffset,
                    width: BRIDGE_THICKNESS, height: CELL / 2,
                    background: COLOR[cell.color],
                    opacity: cell.clearing ? 0.4 : 1,
                  }} />
                )}
                {cell.connections.left && (
                  <div style={{
                    position: 'absolute',
                    left: 0, top: bridgeOffset,
                    width: CELL / 2, height: BRIDGE_THICKNESS,
                    background: COLOR[cell.color],
                    opacity: cell.clearing ? 0.4 : 1,
                  }} />
                )}
                {cell.connections.right && (
                  <div style={{
                    position: 'absolute',
                    right: 0, top: bridgeOffset,
                    width: CELL / 2, height: BRIDGE_THICKNESS,
                    background: COLOR[cell.color],
                    opacity: cell.clearing ? 0.4 : 1,
                  }} />
                )}
              </>
            )}
            {cell && <PuyoCircle color={cell.color} clearing={cell.clearing} ghost={cell.ghost} />}
          </div>
        )),
      )}
    </div>
  );
}
