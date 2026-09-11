'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let settled = false;

    function markReady() {
      if (settled) return;
      settled = true;
      setSessionReady(true);
      setVerifying(false);
    }

    function markFailed() {
      if (settled) return;
      settled = true;
      setMessage('This reset link is invalid or has expired. Please request a new one.');
      setVerifying(false);
    }

    async function establishSession() {
      // The admin-generated recovery link redirects here carrying its
      // tokens in the URL hash (#access_token=...&refresh_token=...&
      // type=recovery). @supabase/ssr's browser client - unlike the plain
      // supabase-js client - does not auto-detect or consume this hash
      // (confirmed: the hash is still sitting in the URL after load,
      // untouched), so the session has to be established explicitly by
      // pulling the tokens out and calling setSession() directly.
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          markReady();
          return;
        }
      }

      // Fall back to a PKCE `code` query param, in case the project is
      // ever switched to that flow instead.
      const code = new URLSearchParams(window.location.search).get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          markReady();
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        markReady();
      } else {
        markFailed();
      }
    }

    establishSession();
    // Runs once on mount only - `supabase` is a fresh object every render
    // (createClient() isn't memoized), so including it here would re-run
    // this on every state update this effect itself causes, looping forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage('');

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">

      <div className="w-full max-w-md bg-card rounded-xl shadow-lg border border-border p-8">

        <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
          Set Your Password
        </h1>

        <p className="text-center text-muted-foreground mb-6">
          Create a secure password for your KopaAlert account.
        </p>

        {message && (
          <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {message}
          </div>
        )}

        {verifying ? (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying your reset link...
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                New Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border bg-card text-foreground rounded-lg px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Confirm Password
              </label>

              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-border bg-card text-foreground rounded-lg px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-3 hover:bg-primary/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Password'}
            </button>

          </form>
        ) : (
          <a
            href="/forgot-password"
            className="block w-full text-center rounded-lg bg-primary text-primary-foreground py-3 hover:bg-primary/90"
          >
            Request a new reset link
          </a>
        )}

      </div>

    </div>
  );
}