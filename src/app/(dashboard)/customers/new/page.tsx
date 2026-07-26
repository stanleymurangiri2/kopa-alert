'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDebt, getCustomersForDebt } from '@/lib/supabase/debts';
import { createClient } from '@/lib/supabase/client';

type Customer = {
  id: string;
  full_name: string;
};

export default function NewDebtPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    customer_id: '',
    amount: '',
    description: '',
    payment_instructions: '',
    due_date: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data } = await getCustomersForDebt();
    setCustomers((data ?? []) as Customer[]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError('');

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

      const { error: createError } = await createDebt({
        business_id: profile.business_id,
        customer_id: form.customer_id,
        amount: Number(form.amount),
        description: form.description.trim(),
        payment_instructions: form.payment_instructions.trim(),
        due_date: form.due_date,
      });

      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }

      router.push('/debts');
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
          <h1 className="text-2xl font-bold">New Debt</h1>
          <p className="text-sm text-gray-500">
            Create a new customer debt.
          </p>
        </div>

        <Link
          href="/debts"
          className="rounded-md border px-4 py-2 hover:bg-gray-100"
        >
          Back
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Customer
            </label>

            <select
              required
              value={form.customer_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  customer_id: e.target.value,
                })
              }
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">Select Customer</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Amount (KES)
            </label>

            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
              className="w-full rounded-md border px-3 py-2"
              placeholder="1000"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="w-full rounded-md border px-3 py-2"
              placeholder="Products supplied on credit"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Payment Instructions
            </label>

            <textarea
              rows={2}
              value={form.payment_instructions}
              onChange={(e) =>
                setForm({
                  ...form,
                  payment_instructions: e.target.value,
                })
              }
              className="w-full rounded-md border px-3 py-2"
              placeholder="Pay via M-Pesa Paybill 123456"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Due Date
            </label>

            <input
              type="date"
              required
              value={form.due_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  due_date: e.target.value,
                })
              }
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Create Debt'}
          </button>
        </form>
      </div>
    </div>
  );
}