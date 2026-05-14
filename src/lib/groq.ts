import OpenAI from 'openai';

export const TEXT_MODEL = 'llama-3.3-70b-versatile';
export const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export function getGroqClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.GROQ_API_KEY!, baseURL: 'https://api.groq.com/openai/v1' });
}

function bigramSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ab = bigrams(a);
  const bb = bigrams(b);
  const intersection = [...ab].filter(x => bb.has(x)).length;
  return (2 * intersection) / (ab.size + bb.size || 1);
}

function sanitizePhoneNumbers(text: string): string {
  return text.replace(/\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/g, '');
}

function qualityCheck(text: string, history: string[]): boolean {
  if (text.length < 100) return false;
  if (/\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/.test(text)) return false;
  for (const h of history) {
    if (h.length > 10 && bigramSimilarity(text, h) > 0.7) return false;
  }
  return true;
}

export async function generatePost(params: {
  history: string[];
  topic: string;
  imageStyle: string;
  avoidText?: string;
}): Promise<{ text: string; imagePrompt: string }> {
  const { history, topic, imageStyle, avoidText } = params;
  const client = getGroqClient();

  const historySection = history.length > 0
    ? `過去の投稿（この口調・文体・絵文字の使い方を完全に再現してください）:\n${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '過去の投稿: なし（丁寧で親しみやすいトーンで作成してください）';

  const avoidSection = avoidText
    ? `\n\n以下の投稿とは異なるトーン・切り口・表現にしてください:\n${avoidText}`
    : '';

  const imageStyleSection = imageStyle
    ? `分析済み画像スタイル（このスタイルを忠実に再現してください）: ${imageStyle}`
    : '画像スタイル: 投稿内容に合う一般的なスタイルで';

  const prompt = `あなたはGoogleビジネスプロフィールの運用プロフェッショナルです。

${historySection}${avoidSection}

トピック: ${topic}

${imageStyleSection}

以下の制約を必ず守ってください:
- 電話番号を含めない
- 実在するロゴ・商標の言及を避ける
- 実在スタッフの名前・顔の描写を避ける
- 過去投稿と被らない表現・内容にする

出力形式（この形式以外の説明文は一切不要）:
【投稿本文】
（ここに投稿テキスト、150〜300文字）

【画像生成用プロンプト】
（英語で: 投稿内容に合い、上記の分析済み画像スタイルを忠実に再現する指示。必ず末尾に "no real faces, no logos, no real people, no storefronts with identifiable signage" を含めること）`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await client.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0].message.content ?? '';
    const bodyMatch = raw.match(/【投稿本文】\n([\s\S]*?)(?:\n\n【画像生成用プロンプト】|$)/);
    const promptMatch = raw.match(/【画像生成用プロンプト】\n([\s\S]*)/);

    const text = sanitizePhoneNumbers((bodyMatch?.[1] ?? raw).trim());
    const imagePrompt = promptMatch?.[1].trim() ?? '';

    if (qualityCheck(text, history)) return { text, imagePrompt };
  }

  return { text: '', imagePrompt: '' };
}
