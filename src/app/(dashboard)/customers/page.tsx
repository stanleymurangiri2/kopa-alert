'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Ban, Download, Eye, Loader2, Pencil, Search, Star, Trash2, Upload } from 'lucide-react';
import { getCustomers, updateCustomer, deleteCustomer } from '@/lib/supabase/customers';
import { getDebts } from '@/lib/supabase/debts';
import { useToast } from '@/components/ui/ToastProvider';
import { normalizeKenyanPhone, isValidKenyanPhone } from '@/lib/utils/phone';
import ImportCsvModal from './ImportCsvModal';

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
  due_date: string;
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

function isDebtOverdue(debt: Debt): boolean {
  const balance = Number(debt.amount) - Number(debt.amount_paid);
  if (balance <= 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(debt.due_date);
  due.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}

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
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortByRating, setSortByRating] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);

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

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setEditForm({
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email ?? '',
    });
    setEditError('');
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      setEditError('Name and phone are required.');
      return;
    }

    if (!isValidKenyanPhone(editForm.phone)) {
      setEditError('Enter the customer\'s real Kenyan mobile number (e.g. 0712345678) - not a placeholder like 0700000000.');
      return;
    }

    setSaving(true);
    setEditError('');

    const { error } = await updateCustomer(editingCustomer.id, {
      full_name: editForm.full_name.trim(),
      phone: normalizeKenyanPhone(editForm.phone),
      email: editForm.email.trim() || null,
    });

    setSaving(false);

    if (error) {
      setEditError(error.message);
      return;
    }

    setEditingCustomer(null);
    showToast('success', 'Customer updated successfully.');
    loadCustomers();
  }

  async function confirmDelete() {
    if (!deletingCustomer) return;

    setDeleting(true);

    const { error } = await deleteCustomer(deletingCustomer.id);

    setDeleting(false);
    setDeletingCustomer(null);

    if (error) {
      showToast('error', error.message || 'Failed to delete customer.');
      return;
    }

    showToast('success', 'Customer and all associated records deleted.');
    loadCustomers();
  }

  const debtSummaryByCustomer = useMemo(() => {
    const summary = new Map<string, { outstanding: number; hasOverdue: boolean }>();

    for (const debt of debts) {
      const entry = summary.get(debt.customer_id) ?? { outstanding: 0, hasOverdue: false };
      if (debt.status !== 'fully_paid') {
        entry.outstanding += Number(debt.amount) - Number(debt.amount_paid);
      }
      if (isDebtOverdue(debt)) {
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
          onClick={() => setShowImportModal(true)}
          className="ml-auto flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>

        <button
          type="button"
          onClick={() => exportCsv(displayedCustomers)}
          disabled={displayedCustomers.length === 0}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
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
                <th className="sticky left-0 z-20 bg-primary px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
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
                  className={`group border-t border-border transition-colors hover:bg-accent ${
                    i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 px-4 py-3 text-[15px] font-semibold text-foreground group-hover:bg-accent ${
                      i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                    }`}
                  >
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(customer)}
                        aria-label={`Edit ${customer.full_name}`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-info hover:bg-info/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingCustomer(customer)}
                        aria-label={`Delete ${customer.full_name}`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <Link
                        href={`/customers/${customer.id}`}
                        aria-label={`View ${customer.full_name}'s profile`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-teal hover:bg-teal/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Edit Customer</h2>

            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              {editError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Email <span className="font-normal text-muted-foreground">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Delete this customer?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">{deletingCustomer.full_name}</span>{' '}
              and all of their debts, payments, and message history. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                disabled={deleting}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}
