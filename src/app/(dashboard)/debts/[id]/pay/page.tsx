'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RecordPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: debtId } = use(params);
  const [paymentData, setPaymentData] = useState({
    amount_paid: '',
    payment_method: 'mpesa',
    notes: '',
  });

  const [debtDetails, setDebtDetails] = useState<{
    customerName: string;
    amount: number;
    amountPaid: number;
    description: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        setError('Debt record not found.');
      } else {
        const remaining = Number(data.amount) - Number(data.amount_paid);
        setDebtDetails({
          customerName: data.customers?.full_name || 'Unknown',
          amount: Number(data.amount),
          amountPaid: Number(data.amount_paid),
          description: data.description,
        });
        setPaymentData((prev) => ({
          ...prev,
          amount_paid: remaining > 0 ? remaining.toString() : '0',
        }));
      }
      setLoading(false);
    }

    loadDebt();
  }, [debtId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payAmount = parseFloat(paymentData.amount_paid);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError('Enter a valid payment amount greater than 0.');
      setSubmitting(false);
      return;
    }

    if (debtDetails) {
      const currentBalance = debtDetails.amount - debtDetails.amountPaid;
      if (payAmount > currentBalance) {
        setError(`Payment amount cannot exceed remaining balance of KES ${currentBalance.toLocaleString()}`);
        setSubmitting(false);
        return;
      }
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

    const { error: insertError } = await supabase.from('payments').insert([
      {
        business_id: profile.business_id,
        debt_id: debtId,
        amount_paid: payAmount,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes.trim() || null,
      },
    ]);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/payments');
    router.refresh();
  };

  if (loading) return <div className="p-6 text-gray-500">Loading payment form...</div>;

  const remainingBalance = debtDetails ? debtDetails.amount - debtDetails.amountPaid : 0;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
        <Link href="/debts" className="text-sm text-gray-500 hover:underline">
          ← Cancel
        </Link>
      </div>

      {debtDetails && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm space-y-1">
          <div>
            <span className="text-blue-700 font-medium">Customer:</span>{' '}
            <span className="font-semibold text-gray-900">{debtDetails.customerName}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">Description:</span>{' '}
            <span className="text-gray-800">{debtDetails.description}</span>
          </div>
          <div className="pt-2 border-t border-blue-200 flex justify-between">
            <div>
              <span className="text-gray-500">Total Debt:</span>{' '}
              <span className="font-mono text-gray-900">KES {debtDetails.amount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Remaining Balance:</span>{' '}
              <span className="font-mono font-bold text-blue-900">
                KES {remainingBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {remainingBalance <= 0 ? (
          <div className="text-center py-4">
            <p className="text-green-700 font-medium text-sm mb-4">
              This debt record has already been fully settled!
            </p>
            <Link href="/debts" className="text-sm text-blue-600 hover:underline">
              Return to Debts List
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount Paid (KES)</label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentData.amount_paid}
                onChange={(e) => setPaymentData({ ...paymentData, amount_paid: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="mpesa">M-Pesa</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes / Reference <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="M-Pesa Code (e.g. QX78TY90) or Receipt #"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Processing Payment...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}