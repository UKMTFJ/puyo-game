import { NextRequest, NextResponse } from 'next/server';
import { getDecryptedToken } from '@/lib/kv';
import { refreshAccessToken, getAccounts, getLocations, getLocalPosts } from '@/lib/gbp';
import { getGroqClient, VISION_MODEL } from '@/lib/groq';

async function analyzeImageStyle(imageUrls: string[]): Promise<string> {
  if (!imageUrls.length) return '';
  const imageContents: { type: 'image_url'; image_url: { url: string } }[] = [];

  for (const url of imageUrls.slice(0, 3)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      const mime = res.headers.get('content-type') ?? 'image/jpeg';
      imageContents.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } });
    } catch {
      continue;
    }
  }

  if (!imageContents.length) return '';

  const response = await getGroqClient().chat.completions.create({
    model: VISION_MODEL,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze the visual style of these GBP post images. Output a concise English description for use as image generation AI prompt. Include: text overlay presence, color palette, atmosphere, decoration elements, overall style. Output style description only, no explanation.',
        },
        ...imageContents,
      ],
    }],
  });

  return response.choices[0].message.content?.trim() ?? '';
}

export async function GET(req: NextRequest) {
  const storeId = req.cookies.get('gbp_store_id')?.value ?? 'default';
  const storeName = req.nextUrl.searchParams.get('storeName') ?? '';

  let accessToken = req.cookies.get('gbp_google_token')?.value ?? null;

  if (!accessToken) {
    const refreshToken = await getDecryptedToken(storeId);
    if (!refreshToken) {
      return NextResponse.json({ error: 'Google認証が必要です', needsAuth: true }, { status: 401 });
    }
    try {
      accessToken = await refreshAccessToken(refreshToken);
    } catch {
      return NextResponse.json({ error: 'トークンの更新に失敗しました。再ログインしてください', needsAuth: true }, { status: 401 });
    }
  }

  try {
    const accounts = await getAccounts(accessToken);
    if (!accounts.length) {
      return NextResponse.json({ error: 'GBPアカウントが見つかりません。このGoogleアカウントにGBPが登録されているか確認してください。' }, { status: 404 });
    }

    const accountName = accounts[0].name;
    const locations = await getLocations(accessToken, accountName, storeName);
    if (!locations.length) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    const location = locations[0];
    const posts = await getLocalPosts(accessToken, location.name);

    const postTexts = posts.map(p => p.summary).filter(Boolean);
    const imageUrls = posts.flatMap(p => p.mediaItems.map(m => m.googleUrl)).filter(Boolean);

    const imageStyle = await analyzeImageStyle(imageUrls);

    const res = NextResponse.json({
      posts: postTexts,
      imageStyle,
      websiteUri: location.websiteUri ?? null,
      locationTitle: location.title,
    });

    if (accessToken) {
      res.cookies.set('gbp_google_token', accessToken, {
        httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600, path: '/',
      });
    }

    return res;
  } catch (error: any) {
    const msg: string = error.message ?? '';
    if (msg.includes('Quota exceeded')) {
      return NextResponse.json({ error: `クォータ超過: ${msg}`, quotaExceeded: true }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
