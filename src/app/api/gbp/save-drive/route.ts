import { NextResponse } from 'next/server';
import { saveAllToDrive } from '@/lib/drive';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.storeName || !body.post1Text || !body.post2Text) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const result = await saveAllToDrive({
      storeName: body.storeName,
      topic1: body.topic1 ?? 'Post1',
      post1Text: body.post1Text,
      post1Image1: body.post1Image1 ?? '',
      post1Image2: body.post1Image2 ?? '',
      topic2: body.topic2 ?? 'Post2',
      post2Text: body.post2Text,
      post2Image1: body.post2Image1 ?? '',
      post2Image2: body.post2Image2 ?? '',
      imageStyle: body.imageStyle ?? '',
      snsUrls: body.snsUrls ?? {},
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Drive save error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
