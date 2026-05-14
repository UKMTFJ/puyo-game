import { NextResponse } from 'next/server';
import { getGroqClient, VISION_MODEL } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (!files.length) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
    }

    const imageContents: { type: 'image_url'; image_url: { url: string } }[] = [];
    for (const file of files.slice(0, 3)) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mimeType = file.type || 'image/jpeg';
      imageContents.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
    }

    const client = getGroqClient();
    const response = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `これらはGoogleビジネスプロフィールの過去の投稿画像です。以下の観点でビジュアルスタイルを分析し、英語で簡潔にまとめてください。画像生成AIへの指示として使うので、スタイル記述のみを出力してください：

- 文字入りか写真のみか（text overlay / photo only）
- 色調・カラーパレット
- 雰囲気（warm/cool/pop/natural/luxury等）
- 装飾要素（フレーム、背景パターン、アイコン等）
- 全体的なスタイル（minimalist/vivid/elegant等）

出力例: "warm-toned product photos with Japanese text overlay, soft bokeh background, pastel pink and white color scheme, minimal decoration, elegant and inviting style"`,
          },
          ...imageContents,
        ],
      }],
    });

    const styleDescription = response.choices[0].message.content?.trim() ?? '';
    return NextResponse.json({ styleDescription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
