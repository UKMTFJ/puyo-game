import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/gbp/login') ||
    pathname.startsWith('/gbp/callback') ||
    pathname.startsWith('/api/gbp/auth') ||
    pathname.startsWith('/api/gbp/google-callback')
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/gbp') || pathname.startsWith('/api/gbp')) {
    const auth = request.cookies.get('gbp_auth');
    if (auth?.value !== process.env.GBP_PASSWORD) {
      return NextResponse.redirect(new URL('/gbp/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/gbp/:path*', '/api/gbp/:path*'],
};
