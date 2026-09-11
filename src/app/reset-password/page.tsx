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
    async function establishSession() {
      // The recovery link lands here with a one-time PKCE `code` - it has
      // to be exchanged for a real session before updateUser() will work.
      // Without this, submitting the form fails with "Auth session missing".
      const code = new URLSearchParams(window.location.search).get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage('This reset link is invalid or has expired. Please request a new one.');
          setVerifying(false);
          return;
        }
        setSessionReady(true);
        setVerifying(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setSessionReady(true);
      } else {
        setMessage('This reset link is invalid or has expired. Please request a new one.');
      }
      setVerifying(false);
    }

    establishSession();
  }, [supabase]);

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