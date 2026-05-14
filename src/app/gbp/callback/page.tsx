'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      router.replace(`/gbp?oauth_error=${encodeURIComponent(error)}`);
      return;
    }

    if (code) {
      const callbackUrl = `/api/gbp/google-callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
      router.replace(callbackUrl);
    } else {
      router.replace('/gbp?oauth_error=no_code');
    }
  }, [params, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ opacity: 0.6 }}>Google認証処理中...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>処理中...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
