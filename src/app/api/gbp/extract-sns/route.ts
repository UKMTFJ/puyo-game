import { NextResponse } from 'next/server';
import { getGroqClient, TEXT_MODEL } from '@/lib/groq';

const SNS_PATTERNS: Record<string, RegExp> = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>)]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>)]+/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>)]+/gi,
  line: /https?:\/\/(?:lin\.ee|line\.me)\/[^\s"'<>)]+/gi,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/[^\s"'<>)]+/gi,
};

function extractFromHtml(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [platform, regex] of Object.entries(SNS_PATTERNS)) {
    if (result[platform]) continue;
    const matches = html.match(regex);
    if (matches?.[0]) result[platform] = matches[0].split(/['")\s]/)[0];
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const { websiteUrl } = await req.json();
    if (!websiteUrl) return NextResponse.json({});

    let html = '';
    try {
      const res = await fetch(websiteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja,en;q=0.9' },
        signal: AbortSignal.timeout(5000),
      });
      html = await res.text();
    } catch {
      return NextResponse.json({});
    }

    const found = extractFromHtml(html);

    const missing = Object.keys(SNS_PATTERNS).filter(k => !found[k]);
    if (missing.length > 0) {
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 3000);

      try {
        const response = await getGroqClient().chat.completions.create({
          model: TEXT_MODEL,
          messages: [{
            role: 'user',
            content: `以下のウェブページ本文から、${missing.join('・')}のSNSアカウントURLを抽出してください。
見つかったURLのみをJSON形式で返してください。見つからない場合は空のJSONを返してください。
{"instagram":"URL","twitter":"URL"} のような形式で。

ページ本文:
${bodyText}`,
          }],
        });

        const raw = response.choices[0].message.content?.trim() ?? '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string' && v.startsWith('http')) found[k] = v;
          }
        }
      } catch {
        // AI extraction failed, return what we found
      }
    }

    return NextResponse.json(found);
  } catch (error: any) {
    return NextResponse.json({});
  }
}
