import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/integrations/supabase/middleware';
import { DRIVER_AUTH_COOKIE } from '@/lib/auth/driver-session';
import { verifySignedSessionTokenEdge } from '@/lib/auth/signed-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/driver' || pathname.startsWith('/driver/')) {
    if (pathname === '/driver/login') {
      return NextResponse.next();
    }

    const token = request.cookies.get(DRIVER_AUTH_COOKIE)?.value;
    const payload = await verifySignedSessionTokenEdge(token, 'driver');

    if (!payload) {
      return NextResponse.redirect(new URL('/driver/login', request.url));
    }
  }

  if (pathname === '/sw.js') {
    return NextResponse.next({
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: ['/account/:path*', '/driver', '/driver/:path*', '/sw.js'],
};
