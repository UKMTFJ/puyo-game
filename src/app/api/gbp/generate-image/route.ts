import { NextResponse } from 'next/server';
import { imageGenerationService, buildImagePrompt } from '@/lib/image-generation';

export async function POST(req: Request) {
  try {
    const { prompt, imageStyle } = await req.json() as { prompt: string; imageStyle?: string };
    if (!prompt) return NextResponse.json({ error: 'プロンプトが必要です' }, { status: 400 });

    const fullPrompt = buildImagePrompt(prompt, imageStyle ?? '');
    const imageUrl = await imageGenerationService.generate(fullPrompt);

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
