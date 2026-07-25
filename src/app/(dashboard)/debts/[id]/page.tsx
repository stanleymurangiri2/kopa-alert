'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditDebtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: debtId } = use(params);
  const [formData, setFormData] = useState({
    due_date: '',
    description: '',
    payment_instructions: '',
  });
  const [debtDetails, setDebtDetails] = useState<{
    customerName: string;
    amount: number;
    amountPaid: number;
    status: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDebt() {
      const { data, error } = await supabase
        .from('debts')
        .select('*, customers(full_name)')
        .eq('id', debtId)
        .single();

      if (error || !data) {
        setError('Debt record not found or access denied.');
      } else {
        setDebtDetails({
          customerName: data.customers?.full_name || 'Unknown',
          amount: data.amount,
          amountPaid: data.amount_paid,
          status: data.status,
        });
        setFormData({
          due_date: data.due_date,
          description: data.description,
          payment_instructions: data.payment_instructions || '',
        });
      }
      setLoading(false);
    }

    loadDebt();
  }, [debtId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('debts')
      .update({
        due_date: formData.due_date,
        description: formData.description.trim(),
        payment_instructions: formData.payment_instructions.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/debts');
    router.refresh();
  };

  if (loading) return <div className="p-6 text-gray-500">Loading debt record...</div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Debt Record</h1>
        <Link href="/debts" className="text-sm text-gray-500 hover:underline">
          ← Back to Debts
        </Link>
      </div>

      {debtDetails && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-1">
          <div>
            <span className="text-gray-500">Customer:</span>{' '}
            <span className="font-semibold text-gray-900">{debtDetails.customerName}</span>
          </div>
          <div>
            <span className="text-gray-500">Total Amount:</span>{' '}
            <span className="font-mono text-gray-900">KES {debtDetails.amount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Remaining Balance:</span>{' '}
            <span className="font-mono font-bold text-gray-900">
              KES {(debtDetails.amount - debtDetails.amountPaid).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Instructions</label>
            <input
              type="text"
              value={formData.payment_instructions}
              onChange={(e) => setFormData({ ...formData, payment_instructions: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving Updates...' : 'Update Debt Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}