'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NotificationTemplate } from '@/types/database.types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .order('days_offset', { ascending: true });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  }

  const handleUpdate = async (template: NotificationTemplate) => {
    setSavingId(template.id);
    setMessage(null);

    const { error } = await supabase
      .from('notification_templates')
      .update({
        message_template: template.message_template,
        days_offset: template.days_offset,
        is_active: template.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id);

    setSavingId(null);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Template saved successfully!' });
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading reminder templates...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
        <p className="text-sm text-gray-500">
          Customize automated SMS alerts. Available variables:{' '}
          <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-xs">
            {'{customer_name}'}
          </code>
          ,{' '}
          <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-xs">
            {'{balance}'}
          </code>
          ,{' '}
          <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-xs">
            {'{due_date}'}
          </code>
          ,{' '}
          <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-xs">
            {'{description}'}
          </code>
          ,{' '}
          <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded text-xs">
            {'{payment_instructions}'}
          </code>
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
              <div>
                <span className="font-bold text-gray-900 capitalize text-base">
                  {tmpl.type.replace('_', ' ')} Reminder
                </span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-semibold uppercase">
                  {tmpl.channel}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={tmpl.is_active}
                  onChange={(e) =>
                    setTemplates((prev) =>
                      prev.map((t) => (t.id === tmpl.id ? { ...t, is_active: e.target.checked } : t))
                    )
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Active
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Days Offset (Relative to Due Date)
                </label>
                <input
                  type="number"
                  value={tmpl.days_offset}
                  onChange={(e) =>
                    setTemplates((prev) =>
                      prev.map((t) =>
                        t.id === tmpl.id ? { ...t, days_offset: parseInt(e.target.value) || 0 } : t
                      )
                    )
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-xs text-gray-400 mt-1 block">
                  {tmpl.days_offset < 0
                    ? `${Math.abs(tmpl.days_offset)} days before due date`
                    : tmpl.days_offset === 0
                    ? 'On exact due date'
                    : `${tmpl.days_offset} days after due date`}
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  value={tmpl.message_template}
                  onChange={(e) =>
                    setTemplates((prev) =>
                      prev.map((t) => (t.id === tmpl.id ? { ...t, message_template: e.target.value } : t))
                    )
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingId === tmpl.id}
                onClick={() => handleUpdate(tmpl)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm disabled:opacity-50"
              >
                {savingId === tmpl.id ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}