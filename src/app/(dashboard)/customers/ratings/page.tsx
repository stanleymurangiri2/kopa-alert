'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, RefreshCw, Star } from 'lucide-react';
import { getCustomers } from '@/lib/supabase/customers';
import { getDebts } from '@/lib/supabase/debts';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  is_blacklisted?: boolean | null;
  rating?: string | null;
};

type Debt = {
  customer_id: string;
  amount: number;
  amount_paid: number;
  due_date: string;
};

type RatingKey = 'Blacklisted' | 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Not rated';

const RATING_ORDER: RatingKey[] = ['Blacklisted', 'Poor', 'Fair', 'Good', 'Excellent', 'Not rated'];

const RATING_STARS: Record<string, number> = {
  Excellent: 5,
  Good: 4,
  Fair: 3,
  Poor: 2,
  Blacklisted: 1,
};

const RATING_STYLES: Record<RatingKey, string> = {
  Blacklisted: 'bg-blacklist text-blacklist-foreground',
  Poor: 'bg-destructive/10 text-destructive',
  Fair: 'bg-warning/10 text-warning',
  Good: 'bg-info/10 text-info',
  Excellent: 'bg-success/10 text-success',
  'Not rated': 'bg-muted text-muted-foreground',
};

const RATING_BAR_STYLES: Record<RatingKey, string> = {
  Blacklisted: 'bg-blacklist',
  Poor: 'bg-destructive',
  Fair: 'bg-warning',
  Good: 'bg-info',
  Excellent: 'bg-success',
  'Not rated': 'bg-muted-foreground',
};

function ratingKey(rating?: string | null): RatingKey {
  if (rating && RATING_ORDER.includes(rating as RatingKey)) return rating as RatingKey;
  return 'Not rated';
}

function isDebtOverdue(debt: Debt): boolean {
  const balance = Number(debt.amount) - Number(debt.amount_paid);
  if (balance <= 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.due_date);
  due.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}

function RatingStars({ rating }: { rating: RatingKey }) {
  if (rating === 'Not rated') {
    return <span className="text-xs text-muted-foreground">Not rated</span>;
  }

  const filled = RATING_STARS[rating] ?? 0;

  return (
    <div className="flex items-center gap-0.5" title={rating}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < filled ? 'fill-rating-gold text-rating-gold' : 'fill-none text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

export default function CustomerRatingsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | RatingKey>('All');
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: customerData }, { data: debtData }] = await Promise.all([
      getCustomers(),
      getDebts(),
    ]);
    setCustomers((customerData ?? []) as Customer[]);
    setDebts((debtData ?? []) as Debt[]);
    setLoading(false);
  }

  async function recalculate() {
    setRecalculating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/ratings/recalculate', { method: 'POST' });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to recalculate ratings.');
      }

      setMessage({
        type: 'success',
        text: `Ratings recalculated for ${result.updated} customer${result.updated === 1 ? '' : 's'}.`,
      });
      await loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to recalculate ratings.',
      });
    } finally {
      setRecalculating(false);
    }
  }

  const debtsByCustomer = useMemo(() => {
    const map = new Map<string, Debt[]>();
    for (const debt of debts) {
      const list = map.get(debt.customer_id) ?? [];
      list.push(debt);
      map.set(debt.customer_id, list);
    }
    return map;
  }, [debts]);

  const enrichedCustomers = useMemo(() => {
    return customers.map((customer) => {
      const customerDebts = debtsByCustomer.get(customer.id) ?? [];

      let outstanding = 0;
      let overdueCount = 0;

      for (const debt of customerDebts) {
        const balance = Number(debt.amount) - Number(debt.amount_paid);
        if (balance > 0) outstanding += balance;
        if (isDebtOverdue(debt)) overdueCount += 1;
      }

      return {
        ...customer,
        rating: ratingKey(customer.is_blacklisted ? 'Blacklisted' : customer.rating),
        totalDebts: customerDebts.length,
        overdueCount,
        outstanding,
      };
    });
  }, [customers, debtsByCustomer]);

  const breakdown = useMemo(() => {
    const counts: Record<RatingKey, number> = {
      Blacklisted: 0,
      Poor: 0,
      Fair: 0,
      Good: 0,
      Excellent: 0,
      'Not rated': 0,
    };

    for (const customer of enrichedCustomers) {
      counts[customer.rating] += 1;
    }

    return counts;
  }, [enrichedCustomers]);

  const displayedCustomers = useMemo(() => {
    let rows = enrichedCustomers;

    if (filter !== 'All') {
      rows = rows.filter((c) => c.rating === filter);
    }

    return [...rows].sort(
      (a, b) => RATING_ORDER.indexOf(a.rating) - RATING_ORDER.indexOf(b.rating)
    );
  }, [enrichedCustomers, filter]);

  const totalRated = enrichedCustomers.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Ratings</h1>
          <p className="text-muted-foreground">
            Payment reliability across your customer portfolio.
          </p>
        </div>

        <button
          type="button"
          onClick={recalculate}
          disabled={recalculating}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
          {recalculating ? 'Recalculating...' : 'Recalculate Ratings'}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          Loading ratings...
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-foreground">Portfolio Breakdown</h2>

            {totalRated === 0 ? (
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            ) : (
              <div className="space-y-3">
                {RATING_ORDER.map((rating) => {
                  const count = breakdown[rating];
                  const pct = totalRated > 0 ? Math.round((count / totalRated) * 100) : 0;

                  return (
                    <div key={rating}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">{rating}</span>
                        <span className="font-mono text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${RATING_BAR_STYLES[rating]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('All')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === 'All'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              All
            </button>
            {RATING_ORDER.map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setFilter(rating)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  filter === rating
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            {displayedCustomers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No customers found.</div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                      Debts
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                      Overdue
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                      Outstanding
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCustomers.map((customer, i) => (
                    <tr
                      key={customer.id}
                      className={`border-t border-border transition-colors hover:bg-accent ${
                        i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-[15px] font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {customer.full_name}
                        </Link>
                        <div className="font-mono text-xs text-muted-foreground">
                          {customer.phone}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <RatingStars rating={customer.rating} />
                      </td>

                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {customer.totalDebts}
                      </td>

                      <td className="px-4 py-3 text-right text-sm">
                        {customer.overdueCount > 0 ? (
                          <span className="font-semibold text-destructive">
                            {customer.overdueCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground">
                        KES {customer.outstanding.toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${RATING_STYLES[customer.rating]}`}
                        >
                          {customer.rating === 'Blacklisted' && <Ban className="h-3 w-3" />}
                          {customer.rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
