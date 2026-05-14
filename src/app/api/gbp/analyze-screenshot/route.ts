import { NextResponse } from 'next/server';
import { getGroqClient, VISION_MODEL } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('screenshot') as File;
    if (!file) return NextResponse.json({ error: 'スクリーンショットが必要です' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/png';

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: `これはGoogleビジネスプロフィールの管理画面または投稿一覧のスクリーンショットです。

以下の2つを抽出してJSON形式で返してください：

1. "posts": 画面に見えている投稿テキストの配列（各投稿の本文を1要素として）
2. "imageStyle": 投稿に使われている画像のビジュアルスタイルを英語で記述（色調・文字入りかどうか・雰囲気・装飾スタイル等）

投稿テキストが見えない場合はpostsを空配列に、画像が見えない場合はimageStyleを空文字にしてください。
JSONのみ返してください。余分な説明は不要です。

出力例:
{
  "posts": ["新メニューのいちごパフェが登場しました！", "GW期間中も営業しています。"],
  "imageStyle": "warm-toned food photography with Japanese text overlay, soft lighting, pastel color palette"
}`,
          },
        ],
      }],
    });

    const raw = response.choices[0].message.content?.trim() ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: '解析結果を取得できませんでした' }, { status: 500 });

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      posts: result.posts ?? [],
      imageStyle: result.imageStyle ?? '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
