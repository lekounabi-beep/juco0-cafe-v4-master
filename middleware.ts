import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/integrations/supabase/middleware";
import { DRIVER_AUTH_COOKIE } from "@/lib/auth/driver-session";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth/admin-session";
import { verifySignedSessionTokenEdge } from "@/lib/auth/signed-session";

async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  const payload = await verifySignedSessionTokenEdge(token, "admin");
  return Boolean(payload);
}

function redirectToAdminLogin(request: NextRequest, redirectPath: string): NextResponse {
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirect", redirectPath);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/driver" || pathname.startsWith("/driver/")) {
    if (pathname === "/driver/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get(DRIVER_AUTH_COOKIE)?.value;
    const payload = await verifySignedSessionTokenEdge(token, "driver");

    if (!payload) {
      return NextResponse.redirect(new URL("/driver/login", request.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!(await hasValidAdminSession(request))) {
      return redirectToAdminLogin(request, pathname);
    }
    return NextResponse.next();
  }

  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) {
    if (process.env.NEXT_PUBLIC_SUPERADMIN_ENABLED === "true") {
      if (!(await hasValidAdminSession(request))) {
        return redirectToAdminLogin(request, pathname);
      }
    }
    return NextResponse.next();
  }

  if (pathname === "/sw.js") {
    return NextResponse.next({
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/account/:path*",
    "/driver",
    "/driver/:path*",
    "/admin",
    "/admin/:path*",
    "/superadmin",
    "/superadmin/:path*",
    "/sw.js",
  ],
};
