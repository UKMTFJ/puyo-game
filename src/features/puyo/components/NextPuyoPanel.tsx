'use client';

import { Pair, ColorPuyo } from '../engine/types';

const COLOR: Record<ColorPuyo, string> = {
  red: '#f87171',
  green: '#4ade80',
  blue: '#3b82f6',
  yellow: '#facc15',
  purple: '#9333ea',
};

const HIGHLIGHT: Record<ColorPuyo, string> = {
  red: '#fca5a5',
  green: '#86efac',
  blue: '#60a5fa',
  yellow: '#fde047',
  purple: '#c084fc',
};

function PuyoDot({ color, size = 28 }: { color: ColorPuyo; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${HIGHLIGHT[color]}, ${COLOR[color]})`,
        border: '2px solid rgba(0,0,0,0.2)',
        boxShadow: 'inset 0 -2px 3px rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}
    />
  );
}

function PairPreview({ pair, size }: { pair: Pair; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <PuyoDot color={pair.subColor} size={size} />
      <PuyoDot color={pair.axisColor} size={size} />
    </div>
  );
}

export function NextPuyoPanel({ nextPairs }: { nextPairs: [Pair, Pair] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '14px 20px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#94a3b8' }}>NEXT</div>
      <PairPreview pair={nextPairs[0]} size={32} />
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
      <PairPreview pair={nextPairs[1]} size={22} />
    </div>
  );
}
