import { NextResponse } from 'next/server';
import { saveEncryptedToken } from '@/lib/kv';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const storeId = searchParams.get('state') ?? 'default';

  if (!code) return NextResponse.redirect(new URL('/gbp?oauth_error=no_code', req.url));

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI!;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenRes.json();

  if (tokens.error) {
    return NextResponse.redirect(new URL(`/gbp?oauth_error=${encodeURIComponent(tokens.error_description ?? tokens.error)}`, req.url));
  }

  if (tokens.refresh_token) {
    try {
      await saveEncryptedToken(storeId, tokens.refresh_token);
    } catch {
      return NextResponse.redirect(new URL('/gbp?oauth_error=kv_save_failed', req.url));
    }
  }

  const res = NextResponse.redirect(new URL(`/gbp?connected=1&store=${encodeURIComponent(storeId)}`, req.url));
  res.cookies.set('gbp_google_token', tokens.access_token, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: tokens.expires_in ?? 3600, path: '/',
  });
  res.cookies.set('gbp_store_id', storeId, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  });
  return res;
}
