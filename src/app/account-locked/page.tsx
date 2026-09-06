import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';

export default async function AccountLockedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*, businesses(business_name, subscription_status, subscription_price, subscription_expires_at)')
    .eq('id', user.id)
    .single();

  const business = profile?.businesses;

  if (profile?.role === 'super_admin' || business?.subscription_status !== 'locked') {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card shadow-lg border border-border p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Account Locked</h1>

        <p className="mt-4 text-sm text-muted-foreground">
          The KopaAlert subscription for <strong className="text-foreground">{business?.business_name}</strong> lapsed
          {business?.subscription_expires_at
            ? ` on ${new Date(business.subscription_expires_at).toLocaleDateString()}`
            : ''}
          , and access to the dashboard has been suspended until payment is arranged.
        </p>

        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          Amount Due: KES {Number(business?.subscription_price ?? 0).toLocaleString()}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Contact support to arrange payment and restore access:
          <br />
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          <br />
          <a href={`tel:${SUPPORT_PHONE}`} className="font-semibold text-primary hover:underline">
            {SUPPORT_PHONE}
          </a>
        </p>

        <form action="/api/signout" method="post" className="mt-8">
          <button
            type="submit"
            className="text-xs font-medium text-muted-foreground hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
