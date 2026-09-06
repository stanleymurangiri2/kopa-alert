'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, Send, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCustomers } from '@/lib/supabase/customers';
import { useToast } from '@/components/ui/ToastProvider';

const MAX_ATTEMPTS = 3;

type Notification = {
  id: string;
  recipient_phone: string;
  message_body: string;
  channel: string;
  status: string;
  attempts: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  customers?: {
    full_name: string;
  } | null;
};

type FilterOption = 'all' | 'pending' | 'sent' | 'failed' | 'permanently_failed';

const PAGE_SIZE = 15;

function StatusBadge({ status, attempts }: { status: string; attempts: number }) {
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" />
        Sent
      </span>
    );
  }

  if (status === 'failed' && attempts >= MAX_ATTEMPTS) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
        <XCircle className="h-3 w-3" />
        Failed (gave up)
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
        <AlertTriangle className="h-3 w-3" />
        Retrying ({attempts}/{MAX_ATTEMPTS})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [page, setPage] = useState(1);
  const [smsBalance, setSmsBalance] = useState<number | null>(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCustomers, setBulkCustomers] = useState<{ id: string; full_name: string; phone: string }[]>(
    []
  );
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function openBulkModal() {
    setShowBulkModal(true);
    setBulkError(null);
    setBulkSelected(new Set());
    setBulkMessage('');
    setBulkSearch('');
    setBulkLoading(true);

    const { data } = await getCustomers();
    setBulkCustomers((data ?? []) as { id: string; full_name: string; phone: string }[]);
    setBulkLoading(false);
  }

  const filteredBulkCustomers = useMemo(() => {
    const query = bulkSearch.trim().toLowerCase();
    if (!query) return bulkCustomers;
    return bulkCustomers.filter(
      (c) => c.full_name.toLowerCase().includes(query) || c.phone.toLowerCase().includes(query)
    );
  }, [bulkCustomers, bulkSearch]);

  function toggleBulkSelected(id: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    const allSelected = filteredBulkCustomers.every((c) => bulkSelected.has(c.id));
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredBulkCustomers.forEach((c) => next.delete(c.id));
      } else {
        filteredBulkCustomers.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  async function sendBulk() {
    if (bulkSelected.size === 0) {
      setBulkError('Select at least one customer.');
      return;
    }

    if (!bulkMessage.trim()) {
      setBulkError('Message cannot be empty.');
      return;
    }

    setBulkSending(true);
    setBulkError(null);

    try {
      const response = await fetch('/api/notifications/bulk-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerIds: [...bulkSelected],
          message: bulkMessage.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send bulk SMS.');
      }

      showToast(
        'success',
        `Sent to ${result.sentCount} of ${result.totalRecipients} recipient${result.totalRecipients === 1 ? '' : 's'}.${
          result.failedCount > 0 ? ` ${result.failedCount} failed.` : ''
        }`
      );

      setShowBulkModal(false);
      loadNotifications();
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to send bulk SMS.');
    } finally {
      setBulkSending(false);
    }
  }

  async function loadNotifications() {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        return;
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('sms_balance')
        .eq('id', profile.business_id)
        .single();

      setSmsBalance(business?.sms_balance ?? null);

      const { data, error } = await supabase
        .from('notification_queue')
        .select(`
          id,
          recipient_phone,
          message_body,
          channel,
          status,
          attempts,
          error_message,
          sent_at,
          created_at,
          customers ( full_name )
        `)
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error(error);
        return;
      }

      setNotifications((data ?? []) as unknown as Notification[]);
    } finally {
      setLoading(false);
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'permanently_failed') {
      return n.status === 'failed' && n.attempts >= MAX_ATTEMPTS;
    }
    return n.status === filter;
  });

  const permanentlyFailedCount = notifications.filter(
    (n) => n.status === 'failed' && n.attempts >= MAX_ATTEMPTS
  ).length;

  const pendingCount = notifications.filter((n) => n.status === 'pending').length;
  const balanceDepleted = smsBalance !== null && smsBalance <= 0;

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading notifications...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SMS Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor SMS reminders and delivery status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openBulkModal}
            disabled={balanceDepleted}
            className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send Bulk SMS
          </button>

          <Link
            href="/settings/templates"
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            View Templates
          </Link>
        </div>
      </div>

      {balanceDepleted && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Your SMS balance is depleted.
            {pendingCount > 0 && (
              <>
                {' '}
                <strong>{pendingCount}</strong> message{pendingCount === 1 ? '' : 's'} waiting to
                send —
              </>
            )}{' '}
            they will send automatically once your balance is topped up. Contact support to add
            credits.
          </p>
        </div>
      )}

      {permanentlyFailedCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{permanentlyFailedCount}</strong> message
            {permanentlyFailedCount === 1 ? '' : 's'} permanently failed after{' '}
            {MAX_ATTEMPTS} attempts — likely an invalid phone number. Check and
            correct the customer&apos;s number.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'sent', label: 'Sent' },
            { value: 'failed', label: 'Retrying' },
            { value: 'permanently_failed', label: 'Gave Up' },
          ] as { value: FilterOption; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setFilter(opt.value);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary">
            <tr>
              <th className="sticky left-0 z-20 bg-primary px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Message
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Channel
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedNotifications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No notifications found.
                </td>
              </tr>
            )}

            {paginatedNotifications.map((notification, i) => (
              <tr
                key={notification.id}
                className={`group border-t border-border transition-colors hover:bg-accent ${
                  i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                }`}
              >
                <td
                  className={`sticky left-0 z-10 px-4 py-3 group-hover:bg-accent ${
                    i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                  }`}
                >
                  <div className="text-[15px] font-semibold text-foreground">
                    {notification.customers?.full_name ?? 'Unknown'}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {notification.recipient_phone}
                  </div>
                </td>

                <td className="max-w-md px-4 py-3">
                  <p className="whitespace-normal break-words text-foreground">
                    &ldquo;{notification.message_body}&rdquo;
                  </p>

                  {notification.error_message && (
                    <p className="mt-1 text-xs text-destructive">
                      {notification.error_message}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3 uppercase text-muted-foreground">
                  {notification.channel}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={notification.status} attempts={notification.attempts} />
                </td>

                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="flex w-full max-w-lg flex-col rounded-lg bg-card p-6 shadow-xl max-h-[90vh]">
            <h2 className="text-lg font-bold text-foreground">Send Bulk SMS</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              SMS balance: <span className="font-mono font-semibold text-foreground">{smsBalance ?? 0}</span>{' '}
              credit{smsBalance === 1 ? '' : 's'}
            </p>

            {bulkError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                {bulkError}
              </div>
            )}

            <input
              type="text"
              value={bulkSearch}
              onChange={(e) => setBulkSearch(e.target.value)}
              placeholder="Search customers..."
              className="mt-4 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    filteredBulkCustomers.length > 0 &&
                    filteredBulkCustomers.every((c) => bulkSelected.has(c.id))
                  }
                  onChange={toggleSelectAllFiltered}
                />
                Select all {bulkSearch ? 'matching' : ''}
              </label>
              <span>{bulkSelected.size} selected</span>
            </div>

            <div className="mt-2 flex-1 overflow-y-auto rounded-md border border-border">
              {bulkLoading ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Loading customers...</p>
              ) : filteredBulkCustomers.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No customers found.</p>
              ) : (
                filteredBulkCustomers.map((customer) => (
                  <label
                    key={customer.id}
                    className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={bulkSelected.has(customer.id)}
                      onChange={() => toggleBulkSelected(customer.id)}
                    />
                    <div>
                      <div className="font-medium text-foreground">{customer.full_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{customer.phone}</div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <label className="mt-4 block text-sm font-medium text-foreground">Message</label>
            <textarea
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              rows={4}
              placeholder="This message is sent as-is to every selected recipient — no {variables}."
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkSending}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendBulk}
                disabled={bulkSending || bulkSelected.size === 0}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90 disabled:opacity-50"
              >
                {bulkSending && <Loader2 className="h-4 w-4 animate-spin" />}
                {bulkSending
                  ? 'Sending...'
                  : `Send to ${bulkSelected.size} recipient${bulkSelected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
