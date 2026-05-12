'use client';

import { Difficulty } from '../engine/types';

type Props = {
  onStart: (difficulty: Difficulty) => void;
};

const DIFFICULTIES: { key: Difficulty; label: string; desc: string }[] = [
  { key: 'easy', label: 'EASY', desc: '800ms' },
  { key: 'normal', label: 'NORMAL', desc: '500ms' },
  { key: 'hard', label: 'HARD', desc: '300ms' },
];

export function TitleScreen({ onStart }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 40,
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            fontWeight: 800,
            letterSpacing: -2,
            background: 'linear-gradient(135deg, #f87171, #c084fc, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8,
          }}
        >
          ぷよぷよ
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0, maxWidth: 'none' }}>
          ← → 移動 ／ Z 反時計回り ／ X 時計回り ／ ↓ 落下 ／ P ポーズ
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#64748b', textAlign: 'center' }}>
          難易度を選択
        </div>
        {DIFFICULTIES.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => onStart(key)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: '#f8fafc',
              padding: '14px 24px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <span>{label}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>{desc}/マス</span>
          </button>
        ))}
      </div>
    </div>
  );
}
