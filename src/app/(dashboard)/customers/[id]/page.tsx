'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCustomerById } from '@/lib/supabase/customers';
import { getDebts, addToDebt } from '@/lib/supabase/debts';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  is_blacklisted?: boolean | null;
  available_credit?: number | null;
};

type Debt = {
  id: string;
  customer_id: string;
  amount: number;
  amount_paid: number;
  description: string;
  due_date: string;
  status: string;
};

type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

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

function ledgerTypeStyle(type: string) {
  const styles: Record<string, string> = {
    LOAN_DISBURSEMENT: 'bg-blue-100 text-blue-700',
    PAYMENT: 'bg-green-100 text-green-700',
    CREDIT_CREATED: 'bg-emerald-100 text-emerald-700',
    CREDIT_APPLIED: 'bg-purple-100 text-purple-700',
    OVERPAYMENT: 'bg-emerald-100 text-emerald-700',
    REFUND: 'bg-orange-100 text-orange-700',
    ADJUSTMENT: 'bg-gray-100 text-gray-700',
    WRITE_OFF: 'bg-red-100 text-red-700',
    REVERSAL: 'bg-red-100 text-red-700',
  };
  return styles[type] ?? 'bg-gray-100 text-gray-700';
}

function ledgerTypeLabel(type: string) {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Top-up form state
  const [topUpDebtId, setTopUpDebtId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpDueDate, setTopUpDueDate] = useState('');
  const [topUpSaving, setTopUpSaving] = useState(false);
  const [topUpError, setTopUpError] = useState('');

  useEffect(() => {
    loadData();
  }, [customerId]);

  async function loadData() {
    setLoading(true);
    setError('');

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setRole(profile?.role ?? null);
    }

    const { data: customerData, error: customerError } =
      await getCustomerById(customerId);

    if (customerError || !customerData) {
      setError('Customer not found.');
      setLoading(false);
      return;
    }

    setCustomer(customerData as Customer);

    const { data: allDebts } = await getDebts();

    const customerDebts = ((allDebts ?? []) as any[]).filter(
      (d) => d.customer_id === customerId
    );

    setDebts(customerDebts as Debt[]);

    const { data: ledgerData } = await supabase
      .from('financial_transactions')
      .select('id, type, amount, description, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    setLedger((ledgerData ?? []) as LedgerEntry[]);

    setLoading(false);
  }

  async function toggleBlacklist() {
    if (!customer) return;

    setUpdating(true);

    const {
      data: { session },
    } = await (await import('@/lib/supabase/client')).createClient().auth.getSession();

    const response = await fetch('/api/customers/blacklist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        customerId: customer.id,
        blacklist: !customer.is_blacklisted,
      }),
    });

    const result = await response.json();

    if (result.success) {
      setCustomer({
        ...customer,
        is_blacklisted: !customer.is_blacklisted,
      });
    } else {
      alert(result.message || 'Failed to update blacklist status.');
    }

    setUpdating(false);
  }

  function openTopUp(debtId: string) {
    setTopUpDebtId(debtId);
    setTopUpAmount('');
    setTopUpDueDate('');
    setTopUpError('');
  }

  function closeTopUp() {
    setTopUpDebtId(null);
    setTopUpError('');
  }

  async function handleTopUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!topUpDebtId) return;

    const amount = Number(topUpAmount);

    if (!amount || amount <= 0) {
      setTopUpError('Enter a valid amount greater than zero.');
      return;
    }

    if (!topUpDueDate) {
      setTopUpError('Select a new due date.');
      return;
    }

    setTopUpSaving(true);
    setTopUpError('');

    const { error } = await addToDebt(topUpDebtId, amount, topUpDueDate);

    if (error) {
      setTopUpError(error.message ?? 'Failed to add to debt.');
      setTopUpSaving(false);
      return;
    }

    setTopUpSaving(false);
    closeTopUp();
    loadData();
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Loading customer...</div>;
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-600">
          {error || 'Customer not found.'}
        </div>
        <Link
          href="/customers"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  const totalOwed = debts.reduce(
    (sum, d) => sum + (d.amount - d.amount_paid),
    0
  );

  const availableCredit = Number(customer.available_credit ?? 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{customer.full_name}</h1>
          <p className="text-gray-500">
            {customer.phone}
            {customer.email ? ` - ${customer.email}` : ''}
          </p>
        </div>

        <Link
          href="/customers"
          className="rounded-md border px-4 py-2 hover:bg-gray-100"
        >
          Back
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <div className="mt-1">
              {customer.is_blacklisted ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  Blacklisted
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Total Outstanding</div>
            <div className="text-xl font-bold">
              KES {totalOwed.toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500">Available Credit</div>
            <div className={`text-xl font-bold ${availableCredit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              KES {availableCredit.toLocaleString()}
            </div>
          </div>

          {(role === 'business_admin' || role === 'super_admin') && (
            <button
              onClick={toggleBlacklist}
              disabled={updating}
              className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                customer.is_blacklisted
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {updating
                ? 'Updating...'
                : customer.is_blacklisted
                ? 'Remove from Blacklist'
                : 'Blacklist Customer'}
            </button>
          )}
        </div>

        {availableCredit > 0 && (
          <p className="mt-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
            This customer has KES {availableCredit.toLocaleString()} in available credit from a past overpayment. It can be applied automatically when you record a new debt for them.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Debts</h2>
          <Link
            href="/debts/new"
            className="text-sm text-blue-600 hover:underline"
          >
            + New Debt
          </Link>
        </div>

        {debts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No debts for this customer.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Balance</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {debts.map((debt) => (
                <>
                  <tr key={debt.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{debt.description}</td>

                    <td className="px-4 py-3">
                      KES {Number(debt.amount).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      KES{' '}
                      {Number(
                        debt.amount - debt.amount_paid
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">{debt.due_date}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor(
                          debt.status
                        )}`}
                      >
                        {debt.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center space-x-3">
                      <Link
                        href={`/debts/${debt.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>

                      {debt.status !== 'fully_paid' && (
                        <button
                          onClick={() => openTopUp(debt.id)}
                          className="text-green-600 hover:underline"
                        >
                          Add to Debt
                        </button>
                      )}
                    </td>
                  </tr>

                  {topUpDebtId === debt.id && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan={6} className="px-4 py-4">
                        <form
                          onSubmit={handleTopUp}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Additional Amount (KES)
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={topUpAmount}
                              onChange={(e) =>
                                setTopUpAmount(e.target.value)
                              }
                              className="w-40 rounded-md border px-3 py-2"
                              placeholder="500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              New Due Date
                            </label>
                            <input
                              type="date"
                              value={topUpDueDate}
                              onChange={(e) =>
                                setTopUpDueDate(e.target.value)
                              }
                              className="rounded-md border px-3 py-2"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={topUpSaving}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {topUpSaving ? 'Saving...' : 'Confirm'}
                          </button>

                          <button
                            type="button"
                            onClick={closeTopUp}
                            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100"
                          >
                            Cancel
                          </button>

                          {topUpError && (
                            <p className="w-full text-sm text-red-600">
                              {topUpError}
                            </p>
                          )}
                        </form>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold">Financial Statement</h2>
          <p className="text-sm text-gray-500">
            Full transaction history for this customer.
          </p>
        </div>

        {ledger.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No transactions yet.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Transaction</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${ledgerTypeStyle(entry.type)}`}
                    >
                      {ledgerTypeLabel(entry.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {entry.description ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    KES {Number(entry.amount).toLocaleString()}
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