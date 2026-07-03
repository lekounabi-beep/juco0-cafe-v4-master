import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { serverLog } from "@/lib/server/logger";

function isAuthSessionMissingError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AuthSessionMissingError" || error.message.includes("Auth session missing"))
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  const { data, error } = await supabase.auth.getUser();

  if (!error) {
    user = data.user;
  } else if (!isAuthSessionMissingError(error)) {
    serverLog.warn("supabase.middleware.auth_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith("/account") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
