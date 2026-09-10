import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Only a same-origin relative path is a valid redirect target - "/x" is
// fine, but "https://evil.com" or "//evil.com" (protocol-relative) would
// send a real, authenticated login flow straight to an attacker's site.
function safeRedirectPath(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/dashboard';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeRedirectPath(requestUrl.searchParams.get('next'));

  if (code) {
    const supabase = await createClient();

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}