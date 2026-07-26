'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDebtById, recordPayment } from '@/lib/supabase/debts';

type Debt = {
  id: string;
  business_id: string;
  amount: number;
  amount_paid: number;
  status: string;
  customers?: {
    full_name: string;
    phone: string;
  };
};

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();

  const debtId = params.id as string;

  const [debt, setDebt] = useState<Debt | null>(null);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDebt();
  }, []);

  async function loadDebt() {
    setLoading(true);

    const { data, error } = await getDebtById(debtId);

    if (error) {
      setError(error.message);
    } else {
      setDebt(data as Debt);
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!debt) return;

    setSaving(true);
    setError('');

    const paymentAmount = Number(amount);

    if (paymentAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      setSaving(false);
      return;
    }

    const balance =
      Number(debt.amount) - Number(debt.amount_paid);

    if (paymentAmount > balance) {
      setError('Payment cannot exceed remaining balance.');
      setSaving(false);
      return;
    }

    const { error } = await recordPayment(
      debt.id,
      debt.business_id,
      paymentAmount,
      paymentMethod,
      notes
    );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push(`/debts/${debt.id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading debt information...
      </div>
    );
  }

  if (!debt) {
    return (
      <div className="p-6">
        Debt not found.
      </div>
    );
  }

  const balance =
    Number(debt.amount) - Number(debt.amount_paid);

  return (
    <div className="max-w-xl mx-auto p-6">

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Record Payment
          </h1>

          <p className="text-sm text-gray-500">
            {debt.customers?.full_name}
          </p>
        </div>

        <Link
          href={`/debts/${debt.id}`}
          className="rounded-md border px-4 py-2 hover:bg-gray-100"
        >
          Back
        </Link>
      </div>


      <div className="mb-5 rounded-lg border bg-white p-5 shadow-sm">

        <div className="grid gap-3">

          <div>
            <p className="text-sm text-gray-500">
              Original Amount
            </p>

            <p className="font-semibold">
              KES {Number(debt.amount).toLocaleString()}
            </p>
          </div>


          <div>
            <p className="text-sm text-gray-500">
              Paid
            </p>

            <p className="font-semibold text-green-600">
              KES {Number(debt.amount_paid).toLocaleString()}
            </p>
          </div>


          <div>
            <p className="text-sm text-gray-500">
              Remaining Balance
            </p>

            <p className="font-semibold text-red-600">
              KES {balance.toLocaleString()}
            </p>
          </div>

        </div>

      </div>


      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}


      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border bg-white p-6 shadow-sm"
      >

        <div>
          <label className="mb-1 block text-sm font-medium">
            Payment Amount (KES)
          </label>

          <input
            type="number"
            required
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            className="w-full rounded-md border px-3 py-2"
            placeholder="500"
          />
        </div>


        <div>
          <label className="mb-1 block text-sm font-medium">
            Payment Method
          </label>

          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value)
            }
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="mpesa">
              M-Pesa
            </option>

            <option value="cash">
              Cash
            </option>

            <option value="bank">
              Bank Transfer
            </option>

            <option value="other">
              Other
            </option>

          </select>
        </div>


        <div>
          <label className="mb-1 block text-sm font-medium">
            Notes
          </label>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            className="w-full rounded-md border px-3 py-2"
            placeholder="Optional payment notes"
          />
        </div>


        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-green-600 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Processing...' : 'Save Payment'}
        </button>

      </form>

    </div>
  );
}