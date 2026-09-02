'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Customer } from '@/types/database.types';

type CustomerWithCredit = Customer & { available_credit?: number };

export default function NewDebtPage() {
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    amount: '',
    description: '',
    payment_instructions: '',
    due_date: '',
    apply_credit: false,
  });
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditNote, setCreditNote] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchCustomers() {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        setError('Failed to fetch customers.');
      } else if (data) {
        setCustomers(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, customer_id: data[0].id }));
        }
      }
      setLoadingCustomers(false);
    }

    fetchCustomers();
  }, [supabase]);

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);
  const availableCredit = Number(selectedCustomer?.available_credit ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreditNote(null);

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid debt amount greater than 0.');
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Authentication required');
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      setError('Missing business credentials.');
      setSubmitting(false);
      return;
    }

    const { data: result, error: rpcError } = await supabase.rpc(
      'create_debt_with_credit',
      {
        p_business_id: profile.business_id,
        p_customer_id: formData.customer_id,
        p_amount: numericAmount,
        p_due_date: formData.due_date,
        p_description: formData.description.trim(),
        p_apply_credit: formData.apply_credit,
        p_payment_instructions: formData.payment_instructions.trim() || null,
        p_created_by: user.id,
      }
    );

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (result?.credit_applied > 0) {
      setCreditNote(
        `KES ${Number(result.credit_applied).toLocaleString()} of available credit was applied to this loan.`
      );
      setTimeout(() => {
        router.push('/debts');
        router.refresh();
      }, 1500);
      return;
    }

    router.push('/debts');
    router.refresh();
  };

  if (loadingCustomers) {
    return <div className="p-6 text-gray-500">Loading customers list...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Record New Debt</h1>
        <Link href="/debts" className="text-sm text-gray-500 hover:underline">
          Cancel
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {creditNote && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-md">
            {creditNote}
          </div>
        )}

        {customers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600 text-sm mb-4">
              You need at least one registered customer before recording a debt.
            </p>
            <Link
              href="/customers/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
            >
              + Add Customer First
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Customer</label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value, apply_credit: false })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {availableCredit > 0 && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <label className="flex items-center gap-2 text-sm text-green-800">
                  <input
                    type="checkbox"
                    checked={formData.apply_credit}
                    onChange={(e) =>
                      setFormData({ ...formData, apply_credit: e.target.checked })
                    }
                  />
                  Apply available credit (KES {availableCredit.toLocaleString()}) to this loan
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Debt Amount (KES)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description / Items</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Goods taken on credit (e.g., 2 bags of cement)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Instructions <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.payment_instructions}
                onChange={(e) =>
                  setFormData({ ...formData, payment_instructions: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Pay via M-Pesa Till 123456"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Recording Debt...' : 'Record Debt'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
