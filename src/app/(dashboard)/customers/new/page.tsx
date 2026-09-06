'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createCustomer } from '@/lib/supabase/customers';
import { createClient } from '@/lib/supabase/client';
import { normalizeKenyanPhone, isValidKenyanPhone } from '@/lib/utils/phone';
import { Loader2 } from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');

    if (!isValidKenyanPhone(form.phone)) {
      setError('Enter the customer\'s real Kenyan mobile number (e.g. 0712345678) - not a placeholder like 0700000000.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You are not logged in.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setError('Business profile not found.');
        setLoading(false);
        return;
      }

      const { error: createError } = await createCustomer({
        business_id: profile.business_id,
        full_name: form.full_name.trim(),
        phone: normalizeKenyanPhone(form.phone),
        email: form.email.trim() || null,
      });

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      router.push('/customers');
      router.refresh();
    } catch {
      setError('Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Customer</h1>
          <p className="text-sm text-muted-foreground">Add a new customer.</p>
        </div>

        <Link
          href="/customers"
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent"
        >
          Back
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="Jane Wanjiru"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="0712345678 or +254712345678"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email (optional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="jane@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-teal py-2.5 font-medium text-teal-foreground hover:bg-teal/90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Saving...' : 'Add Customer'}
          </button>
        </form>
      </div>
    </div>
  );
}
