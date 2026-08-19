'use client';

import { useEffect, useState } from 'react';
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
};

type FilterOption = 'all' | 'pending' | 'sent' | 'failed' | 'permanently_failed';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const supabase = createClient();

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
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setNotifications(data || []);
    } finally {
      setLoading(false);
    }
  }

  function statusStyle(status: string, attempts: number) {
    if (status === 'failed' && attempts >= MAX_ATTEMPTS) {
      return 'bg-red-200 text-red-900';
    }

    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-orange-100 text-orange-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  function statusLabel(status: string, attempts: number) {
    if (status === 'failed' && attempts >= MAX_ATTEMPTS) {
      return 'failed (gave up)';
    }
    if (status === 'failed') {
      return `failed (retry ${attempts}/${MAX_ATTEMPTS})`;
    }
    return status;
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

  if (loading) {
    return <div className="p-6">Loading notifications...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">
          Monitor SMS reminders and delivery status
        </p>
      </div>

      {permanentlyFailedCount > 0 && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <strong>{permanentlyFailedCount}</strong> message
          {permanentlyFailedCount === 1 ? '' : 's'} permanently failed after{' '}
          {MAX_ATTEMPTS} attempts — likely an invalid phone number. Check and
          correct the customer's number.
        </div>
      )}

      <div className="mb-4 flex gap-2">
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
            onClick={() => setFilter(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-left">Message</th>
              <th className="px-4 py-3 text-left">Channel</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Attempts</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>

          <tbody>
            {filteredNotifications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No notifications found.
                </td>
              </tr>
            )}

            {filteredNotifications.map((notification) => (
              <tr key={notification.id} className="border-b last:border-none">
                <td className="px-4 py-3">{notification.recipient_phone}</td>

                <td className="max-w-md px-4 py-3">
                  <p className="whitespace-normal break-words">{notification.message_body}</p>

                  {notification.error_message && (
                    <p className="mt-1 text-xs text-red-600">
                      {notification.error_message}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3 uppercase">{notification.channel}</td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                      notification.status,
                      notification.attempts
                    )}`}
                  >
                    {statusLabel(notification.status, notification.attempts)}
                  </span>
                </td>

                <td className="px-4 py-3">{notification.attempts}</td>

                <td className="px-4 py-3 text-gray-500">
                  {new Date(notification.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




