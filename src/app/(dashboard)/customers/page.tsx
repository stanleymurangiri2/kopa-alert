'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, Download, Eye, Search, Star } from 'lucide-react';
import { getCustomers } from '@/lib/supabase/customers';
import { getDebts } from '@/lib/supabase/debts';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  is_blacklisted?: boolean | null;
  rating?: string | null;
};

type Debt = {
  customer_id: string;
  amount: number;
  amount_paid: number;
  status: string;
};

type CustomerStatus = 'Active' | 'Overdue' | 'Blacklisted';

const RATING_ORDER: Record<string, number> = {
  Excellent: 0,
  Good: 1,
  Fair: 2,
  Poor: 3,
  Blacklisted: 4,
};

const RATING_STARS: Record<string, number> = {
  Excellent: 5,
  Good: 4,
  Fair: 3,
  Poor: 2,
  Blacklisted: 1,
};

const STATUS_STYLES: Record<CustomerStatus, string> = {
  Active: 'bg-success/10 text-success',
  Overdue: 'bg-destructive/10 text-destructive',
  Blacklisted: 'bg-blacklist text-blacklist-foreground',
};

function RatingStars({ rating }: { rating?: string | null }) {
  if (!rating) {
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

function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status === 'Blacklisted' && <Ban className="h-3 w-3" />}
      {status}
    </span>
  );
}

function exportCsv(rows: (Customer & { outstanding: number; status: CustomerStatus })[]) {
  const header = ['Name', 'Phone', 'Email', 'Total Debt (KES)', 'Rating', 'Status'];
  const lines = rows.map((c) =>
    [c.full_name, c.phone, c.email ?? '', c.outstanding, c.rating ?? '', c.status]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(',')
  );

  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortByRating, setSortByRating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    const [{ data: customerData }, { data: debtData }] = await Promise.all([
      getCustomers(),
      getDebts(),
    ]);
    setCustomers((customerData ?? []) as Customer[]);
    setDebts((debtData ?? []) as Debt[]);
    setLoading(false);
  }

  const debtSummaryByCustomer = useMemo(() => {
    const summary = new Map<string, { outstanding: number; hasOverdue: boolean }>();

    for (const debt of debts) {
      const entry = summary.get(debt.customer_id) ?? { outstanding: 0, hasOverdue: false };
      if (debt.status !== 'fully_paid') {
        entry.outstanding += Number(debt.amount) - Number(debt.amount_paid);
      }
      if (debt.status === 'overdue') {
        entry.hasOverdue = true;
      }
      summary.set(debt.customer_id, entry);
    }

    return summary;
  }, [debts]);

  const enrichedCustomers = useMemo(() => {
    return customers.map((customer) => {
      const summary = debtSummaryByCustomer.get(customer.id) ?? {
        outstanding: 0,
        hasOverdue: false,
      };

      const status: CustomerStatus = customer.is_blacklisted
        ? 'Blacklisted'
        : summary.hasOverdue
          ? 'Overdue'
          : 'Active';

      return { ...customer, outstanding: summary.outstanding, status };
    });
  }, [customers, debtSummaryByCustomer]);

  const displayedCustomers = useMemo(() => {
    let rows = enrichedCustomers;

    if (statusFilter !== 'All') {
      rows = rows.filter((c) => c.status === statusFilter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (c) =>
          c.full_name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (c.email ?? '').toLowerCase().includes(query)
      );
    }

    if (sortByRating) {
      rows = [...rows].sort((a, b) => {
        const aRank = a.rating ? RATING_ORDER[a.rating] ?? 99 : 98;
        const bRank = b.rating ? RATING_ORDER[b.rating] ?? 99 : 98;
        return aRank - bRank;
      });
    }

    return rows;
  }, [enrichedCustomers, statusFilter, search, sortByRating]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
          <p className="text-muted-foreground">Manage your customers.</p>
        </div>
        <Link
          href="/customers/new"
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90"
        >
          + Add Customer
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, or email..."
            className="w-64 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | CustomerStatus)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Overdue">Overdue</option>
          <option value="Blacklisted">Blacklisted</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={sortByRating}
            onChange={(e) => setSortByRating(e.target.checked)}
          />
          Sort by payment rating
        </label>

        <button
          type="button"
          onClick={() => exportCsv(displayedCustomers)}
          disabled={displayedCustomers.length === 0}
          className="ml-auto flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading customers...</div>
        ) : displayedCustomers.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No customers found.</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-primary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Total Debt
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Rating
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Actions
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
                  <td className="px-4 py-3 text-[15px] font-semibold text-foreground">
                    {customer.full_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                    {customer.phone}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {customer.email ?? 'N/A'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono text-sm font-bold ${
                      customer.outstanding <= 0
                        ? 'text-success'
                        : customer.status === 'Overdue'
                          ? 'text-destructive'
                          : 'text-foreground'
                    }`}
                  >
                    KES {customer.outstanding.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <RatingStars rating={customer.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/customers/${customer.id}`}
                      aria-label={`View ${customer.full_name}'s profile`}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-teal hover:bg-teal/10"
                    >
                      <Eye className="h-4 w-4" />
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
