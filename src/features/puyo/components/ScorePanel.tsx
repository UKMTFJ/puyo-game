'use client';

type Props = {
  score: number;
  chain: number;
  ojamaPending: number;
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#64748b' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5 }}>
        {value}
      </div>
    </div>
  );
}

export function ScorePanel({ score, chain, ojamaPending }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '14px 20px',
        minWidth: 100,
      }}
    >
      <Row label="SCORE" value={score.toLocaleString()} />
      {chain > 0 && (
        <Row label="CHAIN" value={`${chain}連鎖`} />
      )}
      {ojamaPending > 0 && (
        <Row label="OJAMA" value={`×${ojamaPending}`} />
      )}
    </div>
  );
}
