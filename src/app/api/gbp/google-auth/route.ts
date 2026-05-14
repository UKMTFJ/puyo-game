import { NextRequest, NextResponse } from 'next/server';

const SCOPES = 'https://www.googleapis.com/auth/business.manage';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Google OAuth の設定が不完全です' }, { status: 500 });
  }

  const storeId = req.nextUrl.searchParams.get('storeId') ?? 'default';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: storeId,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
