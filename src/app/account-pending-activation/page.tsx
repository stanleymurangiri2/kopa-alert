import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';

export default async function AccountPendingActivationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*, businesses(business_name, onetime_fee_paid_at)')
    .eq('id', user.id)
    .single();

  const business = profile?.businesses;

  if (profile?.role === 'super_admin' || business?.onetime_fee_paid_at) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card shadow-lg border border-border p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Account Pending Activation</h1>

        <p className="mt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">{business?.business_name}</strong> is approved, but a
          one-time system fee must be paid before the dashboard can be used. This fee is separate
          from the monthly subscription and is only charged once.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Contact support to arrange payment and activate your account:
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
