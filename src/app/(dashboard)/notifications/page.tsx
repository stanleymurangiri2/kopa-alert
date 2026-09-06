'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

  useEffect(() => {
    loadNotifications();
  }, []);

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

        <Link
          href="/settings/templates"
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <FileText className="h-4 w-4" />
          View Templates
        </Link>
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
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
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
                className={`border-t border-border transition-colors hover:bg-accent ${
                  i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                }`}
              >
                <td className="px-4 py-3">
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
    </div>
  );
}
