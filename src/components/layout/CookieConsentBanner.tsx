'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'kopaalert_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private browsing, blocked storage) - skip the banner
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // ignore - the banner will just show again next visit
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-card px-4 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          KopaAlert uses cookies to keep you signed in and to run the platform. By continuing to use
          KopaAlert, you agree to our{' '}
          <Link href="/terms" target="_blank" className="font-medium text-primary hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
