import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { storeName } = await req.json();
    if (!storeName) return NextResponse.json({ error: '店舗名が必要です' }, { status: 400 });

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY が設定されていません' }, { status: 500 });

    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(storeName)}&language=ja&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ error: '店舗が見つかりませんでした' }, { status: 404 });
    }

    const place = searchData.results[0];
    const placeId = place.place_id;

    const detailRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,website,formatted_address,international_phone_number&language=ja&key=${apiKey}`
    );
    const detailData = await detailRes.json();
    const detail = detailData.result;

    return NextResponse.json({
      name: detail.name,
      website: detail.website ?? null,
      address: detail.formatted_address ?? null,
      phone: detail.international_phone_number ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
