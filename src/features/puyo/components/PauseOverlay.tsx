'use client';

type Props = {
  onResume: () => void;
  onTitle: () => void;
};

export function PauseOverlay({ onResume, onTitle }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        borderRadius: 8,
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: 4 }}>
        PAUSE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 180 }}>
        <button onClick={onResume} style={btnStyle('#6366f1')}>
          再開
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
    padding: '11px 0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: 15,
    width: '100%',
  };
}
