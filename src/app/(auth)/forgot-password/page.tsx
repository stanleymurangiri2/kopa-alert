'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    notFound?: boolean;
  } | null>(null);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: result.error ?? 'Unable to send reset link.',
        });
        return;
      }

      if (result.notFound) {
        setMessage({
          type: 'error',
          text: result.message ?? 'No account found for that email.',
          notFound: true,
        });
        return;
      }

      setMessage({
        type: 'success',
        text: result.message ?? 'A reset link has been sent to your email.',
      });

      setEmail('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card shadow-lg border border-border p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Forgot Password
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email address to receive a password reset link.
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {message.text}
            {message.notFound && (
              <>
                {' '}
                <Link href="/register" className="font-semibold underline">
                  Register your business
                </Link>
              </>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="stanleymurangiri2@gmail.com"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
