'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDebts } from '@/lib/supabase/debts';

type Debt = {
  id: string;
  amount: number;
  amount_paid: number;
  description: string;
  due_date: string;
  status: string;
  customers?: {
    full_name: string;
    phone: string;
  };
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebts();
  }, []);

  async function loadDebts() {
    setLoading(true);

    const { data } = await getDebts();

    setDebts((data ?? []) as Debt[]);
    setLoading(false);
  }

  function badgeColor(status: string) {
    switch (status) {
      case 'fully_paid':
        return 'bg-green-100 text-green-700';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  }

  return (
    <div className="p-6">

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debts</h1>
          <p className="text-gray-500">
            Manage customer debts.
          </p>
        </div>

        <Link
          href="/debts/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + New Debt
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">

        {loading ? (
          <div className="p-6 text-center">
            Loading debts...
          </div>
        ) : debts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No debts found.
          </div>
        ) : (
          <table className="min-w-full">

            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Paid</th>
                <th className="px-4 py-3 text-left">Balance</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {debts.map((debt) => (
                <tr
                  key={debt.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {debt.customers?.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {debt.customers?.phone}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    KES {Number(debt.amount).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-green-700">
                    KES {Number(debt.amount_paid).toLocaleString()}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    KES{' '}
                    {Number(
                      debt.amount - debt.amount_paid
                    ).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    {debt.due_date}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor(
                        debt.status
                      )}`}
                    >
                      {debt.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/debts/${debt.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}

      </div>
    </div>
  );
}