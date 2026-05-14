'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GBPLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/gbp/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/gbp');
    } else {
      const data = await res.json();
      setError(data.error || 'エラーが発生しました');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div className="glass" style={{ padding: '3rem', borderRadius: '16px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>GBP Post Automator</h1>
        <p style={{ marginBottom: '2rem', opacity: 0.6, fontSize: '0.9rem' }}>社内専用ツールです。パスワードを入力してください。</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'inherit',
              fontSize: '1rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={!password || loading}>
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
