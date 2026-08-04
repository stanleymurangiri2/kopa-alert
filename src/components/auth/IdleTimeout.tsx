'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

export default function IdleTimeout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function signOutIdle() {
      await supabase.auth.signOut();
      router.push('/login');
    }

    function resetTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(signOutIdle, IDLE_TIMEOUT_MS);
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [router]);

  return null;
}