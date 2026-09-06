import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';

export default async function AccountSuspendedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*, businesses(business_name, status)')
    .eq('id', user.id)
    .single();

  const business = profile?.businesses;

  if (profile?.role === 'super_admin' || business?.status !== 'suspended') {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-card shadow-lg border border-border p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Account Suspended</h1>

        <p className="mt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">{business?.business_name}</strong> and its team no longer have
          access to KopaAlert. This account was suspended by KopaAlert administration.
        </p>

        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-left text-sm text-destructive">
          <p className="font-medium">What you can do:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Contact support below if you believe this is a mistake.</li>
            <li>Ask support what needs to be resolved before access can be restored.</li>
            <li>Your data (customers, debts, payments) is preserved and not deleted while suspended.</li>
          </ul>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Contact support:
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
