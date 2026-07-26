'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getDebtById,
  updateDebt,
  deleteDebt,
} from '@/lib/supabase/debts';

type Debt = {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  amount_paid: number;
 description: string;
  payment_instructions: string | null;
  due_date: string;
  status: 'pending' | 'partially_paid' | 'fully_paid' | 'overdue';
  customers?: {
    id: string;
    full_name: string;
    phone: string;
    email?: string | null;
  };
};

export default function DebtDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const debtId = params.id as string;

  const [debt, setDebt] = useState<Debt | null>(null);
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

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!debt) return;

    setSaving(true);
    setError('');

    const { error } = await updateDebt(debt.id, {
      amount: Number(debt.amount),
      description: debt.description,
      payment_instructions: debt.payment_instructions,
      due_date: debt.due_date,
    });

    if (error) {
      setError(error.message);
    } else {
      alert('Debt updated successfully.');
      await loadDebt();
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!debt) return;

    const confirmed = confirm(
      'Delete this debt record? This action cannot be undone.'
    );

    if (!confirmed) return;

    const { error } = await deleteDebt(debt.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push('/debts');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading debt...
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

  const balance = Number(debt.amount) - Number(debt.amount_paid);

  return (
    <div className="max-w-3xl mx-auto p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Debt Details
          </h1>
          <p className="text-sm text-gray-500">
            Manage customer debt.
          </p>
        </div>

        <Link
          href="/debts"
          className="rounded-md border px-4 py-2 hover:bg-gray-100"
        >
          Back
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          Customer Information
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-medium">
              {debt.customers?.full_name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p>{debt.customers?.phone}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Amount</p>
            <p className="font-semibold">
              KES {Number(debt.amount).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Paid</p>
            <p className="text-green-600 font-semibold">
              KES {Number(debt.amount_paid).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-red-600 font-semibold">
              KES {balance.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium capitalize">
              {debt.status.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-lg border bg-white p-6 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Amount (KES)
          </label>

          <input
            type="number"
            min="1"
            step="0.01"
            value={debt.amount}
            onChange={(e) =>
              setDebt({
                ...debt,
                amount: Number(e.target.value),
              })
            }
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description
          </label>

          <textarea
            rows={3}
            value={debt.description}
            onChange={(e) =>
              setDebt({
                ...debt,
                description: e.target.value,
              })
            }
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Payment Instructions
          </label>

          <textarea
            rows={2}
            value={debt.payment_instructions ?? ''}
            onChange={(e) =>
              setDebt({
                ...debt,
                payment_instructions: e.target.value,
              })
            }
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Due Date
          </label>

          <input
            type="date"
            value={debt.due_date}
            onChange={(e) =>
              setDebt({
                ...debt,
                due_date: e.target.value,
              })
            }
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <div className="flex flex-wrap gap-3">

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <Link
            href={`/debts/${debt.id}/pay`}
            className="rounded-md bg-green-600 px-5 py-2 text-white hover:bg-green-700"
          >
            Record Payment
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-5 py-2 text-white hover:bg-red-700"
          >
            Delete Debt
          </button>

        </div>
      </form>

    </div>
  );
}