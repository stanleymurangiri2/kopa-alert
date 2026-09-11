import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Only a same-origin relative path is a valid redirect target - "/x" is
// fine, but "https://evil.com", "//evil.com" (protocol-relative), or
// "/\evil.com" (backslash - WHATWG URL parsing treats it the same as a
// forward slash for special schemes, so this also resolves off-origin)
// would send a real, authenticated login flow straight to an attacker's
// site. Resolving the candidate against the request's own origin and
// checking the result lands back on that same origin closes off this
// whole class of parser-quirk bypass, not just the specific ones seen.
function safeRedirectPath(next: string | null, requestUrl: URL): string {
  if (!next || !next.startsWith('/')) {
    return '/dashboard';
  }

  const resolved = new URL(next, requestUrl);
  return resolved.origin === requestUrl.origin
    ? resolved.pathname + resolved.search + resolved.hash
    : '/dashboard';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeRedirectPath(requestUrl.searchParams.get('next'), requestUrl);

  if (code) {
    const supabase = await createClient();

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}