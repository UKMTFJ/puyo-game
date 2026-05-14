import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== process.env.GBP_PASSWORD) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('gbp_auth', password, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
