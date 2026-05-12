'use client';

type Props = {
  score: number;
  onRetry: () => void;
  onTitle: () => void;
};

export function GameOverScreen({ score, onRetry, onTitle }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        borderRadius: 8,
        zIndex: 10,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#f87171', marginBottom: 8 }}>
          GAME OVER
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>SCORE</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: '#f8fafc', letterSpacing: -1 }}>
          {score.toLocaleString()}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 200 }}>
        <button onClick={onRetry} style={btnStyle('#6366f1')}>
          もう一度
        </button>
        <button onClick={onTitle} style={btnStyle('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.15)')}>
          タイトルへ
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg: string, border?: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${border ?? bg}`,
    borderRadius: 10,
    color: '#f8fafc',
    padding: '12px 0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 15,
    width: '100%',
  };
}
