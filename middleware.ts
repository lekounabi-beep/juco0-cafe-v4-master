import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/integrations/supabase/middleware';
import { DRIVER_AUTH_COOKIE } from '@/lib/auth/driver-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Server redirect — no client JS needed (fixes mobile black screen on /driver).
  if (pathname === '/driver') {
    const hasAuth = request.cookies.get(DRIVER_AUTH_COOKIE)?.value === '1';
    if (!hasAuth) {
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
  matcher: ['/account/:path*', '/driver', '/sw.js'],
};
