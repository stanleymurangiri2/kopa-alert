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
      return 'bg-success/10 text-success';
    case 'partially_paid':
      return 'bg-warning/10 text-warning';
    case 'overdue':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-info/10 text-info';
  }
}

function displayStatus(debt: Debt): string {
  const balance = Number(debt.amount) - Number(debt.amount_paid);
  if (balance <= 0) return 'fully_paid';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.due_date);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) return 'overdue';
  return debt.status;
}

function ledgerTypeStyle(type: string) {
  const styles: Record<string, string> = {
    LOAN_DISBURSEMENT: 'bg-info/10 text-info',
    PAYMENT: 'bg-success/10 text-success',
    CREDIT_CREATED: 'bg-success/10 text-success',
    CREDIT_APPLIED: 'bg-employee/10 text-employee',
    OVERPAYMENT: 'bg-success/10 text-success',
    REFUND: 'bg-warning/10 text-warning',
    ADJUSTMENT: 'bg-muted text-muted-foreground',
    WRITE_OFF: 'bg-destructive/10 text-destructive',
    REVERSAL: 'bg-destructive/10 text-destructive',
  };
  return styles[type] ?? 'bg-muted text-muted-foreground';
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
    return <div className="p-6 text-muted-foreground">Loading customer...</div>;
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error || 'Customer not found.'}
        </div>
        <Link
          href="/customers"
          className="mt-4 inline-block text-primary hover:underline"
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
          <h1 className="text-2xl font-bold text-foreground">{customer.full_name}</h1>
          <p className="text-muted-foreground">
            {customer.phone}
            {customer.email ? ` - ${customer.email}` : ''}
          </p>
        </div>

        <Link
          href="/customers"
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent"
        >
          Back
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="mt-1">
              {customer.is_blacklisted ? (
                <span className="rounded-full bg-blacklist px-3 py-1 text-sm font-medium text-blacklist-foreground">
                  Blacklisted
                </span>
              ) : (
                <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
            <div className="font-mono text-xl font-bold text-foreground">
              KES {totalOwed.toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Available Credit</div>
            <div className={`font-mono text-xl font-bold ${availableCredit > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              KES {availableCredit.toLocaleString()}
            </div>
          </div>

          {(role === 'business_admin' || role === 'super_admin') && (
            <button
              onClick={toggleBlacklist}
              disabled={updating}
              className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                customer.is_blacklisted
                  ? 'bg-success text-success-foreground hover:bg-success/90'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
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
          <p className="mt-4 rounded-md bg-success/10 border border-success/30 px-4 py-2 text-sm text-success">
            This customer has KES {availableCredit.toLocaleString()} in available credit from a past overpayment. It can be applied automatically when you record a new debt for them.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Debts</h2>
          <Link
            href="/debts/new"
            className="text-sm text-primary hover:underline"
          >
            + New Debt
          </Link>
        </div>

        {debts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No debts for this customer.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-primary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Description</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-primary-foreground">Action</th>
              </tr>
            </thead>

            <tbody>
              {debts.map((debt, i) => (
                <>
                  <tr key={debt.id} className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}>
                    <td className="px-4 py-3 text-muted-foreground">{debt.description}</td>

                    <td className="px-4 py-3 font-mono text-foreground">
                      KES {Number(debt.amount).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      KES{' '}
                      {Number(
                        debt.amount - debt.amount_paid
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">{debt.due_date}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor(
                          displayStatus(debt)
                        )}`}
                      >
                        {displayStatus(debt).replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center space-x-3">
                      <Link
                        href={`/debts/${debt.id}`}
                        className="text-info hover:underline"
                      >
                        View
                      </Link>

                      {debt.status !== 'fully_paid' && (
                        <button
                          onClick={() => openTopUp(debt.id)}
                          className="text-teal hover:underline"
                        >
                          Add to Debt
                        </button>
                      )}
                    </td>
                  </tr>

                  {topUpDebtId === debt.id && (
                    <tr className="border-t border-border bg-table-stripe">
                      <td colSpan={6} className="px-4 py-4">
                        <form
                          onSubmit={handleTopUp}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
                              className="w-40 rounded-md border border-border bg-card px-3 py-2 text-foreground"
                              placeholder="500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              New Due Date
                            </label>
                            <input
                              type="date"
                              value={topUpDueDate}
                              onChange={(e) =>
                                setTopUpDueDate(e.target.value)
                              }
                              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={topUpSaving}
                            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90 disabled:opacity-50"
                          >
                            {topUpSaving ? 'Saving...' : 'Confirm'}
                          </button>

                          <button
                            type="button"
                            onClick={closeTopUp}
                            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
                          >
                            Cancel
                          </button>

                          {topUpError && (
                            <p className="w-full text-sm text-destructive">
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

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Financial Statement</h2>
          <p className="text-sm text-muted-foreground">
            Full transaction history for this customer.
          </p>
        </div>

        {ledger.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-primary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Transaction</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Description</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry, i) => (
                <tr key={entry.id} className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${ledgerTypeStyle(entry.type)}`}
                    >
                      {ledgerTypeLabel(entry.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {entry.description ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
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
