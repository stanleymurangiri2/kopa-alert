'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NotificationQueueItem } from '@/types/database.types';

export default function NotificationsQueuePage() {
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchQueue();
  }, [filterStatus]);

  async function fetchQueue() {
    setLoading(true);
    let query = supabase
      .from('notification_queue')
      .select('*, customers(full_name)')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (!error && data) {
      setQueue(data);
    }
    setLoading(false);
  }

  const triggerDailyScan = async () => {
    setGenerating(true);
    setMsg(null);

    const { data, error } = await supabase.rpc('generate_daily_reminders');

    setGenerating(false);

    if (error) {
      setMsg(`Error generating reminders: ${error.message}`);
    } else {
      setMsg(`Scan complete! ${data} new reminder(s) added to queue.`);
      fetchQueue();
    }
  };

  const cancelQueueItem = async (id: string) => {
    const { error } = await supabase
      .from('notification_queue')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (!error) {
      fetchQueue();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Queue</h1>
          <p className="text-sm text-gray-500">
            Monitor and manage outbound automated customer reminders
          </p>
        </div>
        <button
          onClick={triggerDailyScan}
          disabled={generating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2 px-4 rounded-md shadow-sm disabled:opacity-50"
        >
          {generating ? 'Scanning Debts...' : '⚡ Run Manual Reminders Scan'}
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-md">
          {msg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 text-sm font-medium">
        {['all', 'pending', 'sent', 'failed', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-md capitalize ${
              filterStatus === st
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Recipient Phone</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Message Body</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Scheduled For</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-gray-500 text-center">
                  Loading queue...
                </td>
              </tr>
            ) : queue.length > 0 ? (
              queue.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {item.customers?.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-700">{item.recipient_phone}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-sm truncate text-xs font-mono">
                    {item.message_body}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        item.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : item.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(item.scheduled_for).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => cancelQueueItem(item.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No notifications in queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}