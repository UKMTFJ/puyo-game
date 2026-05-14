import { NextResponse } from 'next/server';
import { getGroqClient, TEXT_MODEL } from '@/lib/groq';

function extractText(html: string): string {
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '';
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '';
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '';
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .match(/<(?:h[1-4]|p|li|span|div)[^>]*>([^<]{10,200})<\/(?:h[1-4]|p|li|span|div)>/gi)
    ?.map(t => t.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .slice(0, 30)
    .join(' ') ?? '';

  return [title, ogTitle, metaDesc, ogDesc, bodyText].filter(Boolean).join('\n').slice(0, 4000);
}

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ja,en;q=0.9',
    },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();
  return extractText(html);
}

export async function POST(req: Request) {
  try {
    const { urls, pastPosts }: { urls: string[]; pastPosts?: string[] } = await req.json();
    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    const texts: string[] = [];
    for (const url of urls.filter(Boolean)) {
      try {
        const text = await fetchPageText(url);
        if (text.length > 50) texts.push(`[${url}]\n${text}`);
      } catch {
        // skip unreachable URLs
      }
    }

    if (texts.length === 0) {
      return NextResponse.json({ error: 'URLからコンテンツを取得できませんでした。' }, { status: 400 });
    }

    const pastSection = pastPosts?.length
      ? `\n\n以下の過去投稿テーマとは被らないトピックにしてください:\n${pastPosts.slice(0, 10).map((p, i) => `${i + 1}. ${p.slice(0, 80)}`).join('\n')}`
      : '';

    const response = await getGroqClient().chat.completions.create({
      model: TEXT_MODEL,
      messages: [{
        role: 'user',
        content: `以下のウェブページの内容を読んで、このお店・サービスのGoogleビジネスプロフィール投稿に使える具体的なトピックを日本語で5つ提案してください。

ページ内容をよく読み、そのお店特有の情報（商品名・サービス名・特徴・季節イベント・キャンペーン等）を反映した具体的なトピックにしてください。
各トピックは15〜30文字程度の簡潔なフレーズにしてください。
番号付きリストで出力してください。他の説明文は不要です。${pastSection}

${texts.join('\n\n')}`,
      }],
    });

    const raw = response.choices[0].message.content ?? '';
    const topics = raw
      .split('\n')
      .filter(line => /^\d+[\.\)、．]/.test(line.trim()))
      .map(line => line.replace(/^\d+[\.\)、．]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 5);

    return NextResponse.json({ topics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
