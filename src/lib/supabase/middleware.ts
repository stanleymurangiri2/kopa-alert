import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<
    typeof NextResponse.prototype.cookies.set
  >[2];
};

export async function updateSession(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(
            ({ name, value }: CookieToSet) => {
              request.cookies.set(name, value);
            }
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(
            ({ name, value, options }: CookieToSet) => {
              // Strip maxAge/expires so the cookie becomes a true
              // browser-session cookie — dies when the browser fully
              // closes, not on a fixed persistent expiry. Required
              // for businesses sharing devices with employees.
              const { maxAge, expires, ...sessionOnlyOptions } =
                options ?? {};

              response.cookies.set(
                name,
                value,
                sessionOnlyOptions
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    return response;
  }

  // Routes anyone (signed in or not) can view without being bounced away.
  // /reset-password belongs here, not in authOnlyRoutes: a recovery link
  // can land on a browser that still has an unrelated valid session (a
  // second tab, a shared device), and bouncing that request to /dashboard
  // before the page's client-side verifyOtp() ever runs would silently
  // break the reset link with no error shown.
  const alwaysAccessibleRoutes = ["/terms", "/privacy", "/reset-password"];

  // Routes only relevant to signed-out visitors — a signed-in user hitting
  // one of these gets sent to their dashboard instead.
  const authOnlyRoutes = [
    "/login",
    "/register",
    "/forgot-password",
  ];

  const isPublicRoute =
    alwaysAccessibleRoutes.some((route) => pathname.startsWith(route)) ||
    authOnlyRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/admin/login");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    authOnlyRoutes.some((route) => pathname.startsWith(route))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/admin/login")) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "super_admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}