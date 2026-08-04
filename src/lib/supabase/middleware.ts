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

  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  const isPublicRoute =
    publicRoutes.some((route) =>
      pathname.startsWith(route)
    ) || pathname.startsWith("/admin/login");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    publicRoutes.some((route) =>
      pathname.startsWith(route)
    )
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}