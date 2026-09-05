'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Ban,
  Bell,
  CheckCircle2,
  Clock,
  Hourglass,
  Pencil,
  Trash2,
} from 'lucide-react';
import { deleteDebt, getDebts } from '@/lib/supabase/debts';

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

type LedgerTone = 'success' | 'warning' | 'destructive' | 'blacklist' | 'info';

const TONE_PILL_STYLES: Record<LedgerTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  blacklist: 'bg-blacklist text-blacklist-foreground',
  info: 'bg-info/10 text-info',
};

function daysUntilDue(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function getLedgerStatus(debt: Debt) {
  const balance = Number(debt.amount) - Number(debt.amount_paid);

  if (balance <= 0 || debt.status === 'fully_paid') {
    return { label: 'Paid', tone: 'success' as LedgerTone, Icon: CheckCircle2, dueDateClass: '' };
  }

  const diff = daysUntilDue(debt.due_date);

  if (diff < 0) {
    const overdueDays = -diff;
    if (overdueDays >= 10) {
      return {
        label: 'Overdue 10+ days',
        tone: 'blacklist' as LedgerTone,
        Icon: Ban,
        dueDateClass: 'font-bold text-destructive',
      };
    }
    return {
      label: `Overdue ${overdueDays}d`,
      tone: 'destructive' as LedgerTone,
      Icon: Bell,
      dueDateClass: 'font-bold text-destructive',
    };
  }

  if (diff === 0) {
    return {
      label: 'Due today',
      tone: 'destructive' as LedgerTone,
      Icon: Bell,
      dueDateClass: 'font-bold text-destructive',
    };
  }

  if (diff <= 3) {
    return {
      label: `${diff} day${diff > 1 ? 's' : ''}`,
      tone: 'warning' as LedgerTone,
      Icon: Hourglass,
      dueDateClass: 'text-warning',
    };
  }

  return {
    label: debt.status === 'partially_paid' ? 'Partially paid' : 'Upcoming',
    tone: 'info' as LedgerTone,
    Icon: Clock,
    dueDateClass: 'text-muted-foreground',
  };
}

function LedgerStatusBadge({ debt }: { debt: Debt }) {
  const { label, tone, Icon } = getLedgerStatus(debt);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${TONE_PILL_STYLES[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [debtPendingDelete, setDebtPendingDelete] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDebts();
  }, []);

  async function loadDebts() {
    setLoading(true);
    const { data } = await getDebts();
    setDebts((data ?? []) as Debt[]);
    setLoading(false);
  }

  async function confirmDelete() {
    if (!debtPendingDelete) return;
    setDeleting(true);
    await deleteDebt(debtPendingDelete.id);
    setDeleting(false);
    setDebtPendingDelete(null);
    loadDebts();
  }

  const summary = useMemo(() => {
    let totalOutstanding = 0;
    let dueToday = 0;
    let overdue = 0;

    for (const debt of debts) {
      const balance = Number(debt.amount) - Number(debt.amount_paid);
      if (balance <= 0) continue;

      totalOutstanding += balance;

      const diff = daysUntilDue(debt.due_date);
      if (diff === 0) dueToday += balance;
      if (diff < 0) overdue += balance;
    }

    return { totalOutstanding, dueToday, overdue };
  }, [debts]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debt Ledger</h1>
          <p className="text-muted-foreground">Manage customer debts.</p>
        </div>

        <Link
          href="/debts/new"
          className="flex items-center gap-1 rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90"
        >
          + Add New Debt
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total Outstanding
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            KES {summary.totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Due Today
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            KES {summary.dueToday.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Overdue
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-destructive">
            KES {summary.overdue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading debts...</div>
        ) : debts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No debts found.</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-sidebar">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-sidebar-foreground">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {debts.map((debt, i) => {
                const balance = Number(debt.amount) - Number(debt.amount_paid);
                const isSettled = balance <= 0;
                const { dueDateClass } = getLedgerStatus(debt);

                return (
                  <tr
                    key={debt.id}
                    className={`border-t border-border transition-colors hover:bg-accent ${
                      i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[15px] font-semibold text-foreground">
                        {debt.customers?.full_name}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {debt.customers?.phone}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {debt.description}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                      KES {Number(debt.amount).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground">
                      KES {balance.toLocaleString()}
                    </td>

                    <td className={`px-4 py-3 text-sm ${dueDateClass}`}>{debt.due_date}</td>

                    <td className="px-4 py-3">
                      <LedgerStatusBadge debt={debt} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {!isSettled && (
                          <Link
                            href={`/debts/${debt.id}/pay`}
                            className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90"
                          >
                            Record Payment
                          </Link>
                        )}
                        <Link
                          href={`/debts/${debt.id}`}
                          aria-label="Edit debt"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-info hover:bg-info/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDebtPendingDelete(debt)}
                          aria-label="Delete debt"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {debtPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Delete this debt?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete the debt record for{' '}
              <span className="font-medium text-foreground">
                {debtPendingDelete.customers?.full_name}
              </span>{' '}
              ({debtPendingDelete.description})? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDebtPendingDelete(null)}
                disabled={deleting}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
