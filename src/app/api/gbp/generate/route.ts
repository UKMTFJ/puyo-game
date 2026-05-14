import { NextResponse } from 'next/server';
import { generatePost } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const { history, topics, imageStyle, storeName } = await req.json() as {
      history: string[];
      topics: [string, string];
      imageStyle: string;
      storeName: string;
    };

    if (!topics?.[0] || !topics?.[1]) {
      return NextResponse.json({ error: 'トピックが2件必要です' }, { status: 400 });
    }

    const post1 = await generatePost({
      history: history ?? [],
      topic: topics[0],
      imageStyle: imageStyle ?? '',
    });

    const post2 = await generatePost({
      history: history ?? [],
      topic: topics[1],
      imageStyle: imageStyle ?? '',
      avoidText: post1.text,
    });

    return NextResponse.json({ posts: [post1, post2] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
