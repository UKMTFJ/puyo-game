import { NextResponse } from 'next/server';

// Replaced by /api/gbp/save-drive
export async function POST() {
  return NextResponse.json({ error: 'このエンドポイントは /api/gbp/save-drive に移行されました' }, { status: 410 });
}
