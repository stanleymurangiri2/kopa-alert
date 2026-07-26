'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ReminderType = 'upcoming' | 'due_today' | 'overdue';

type Template = {
  id: string;
  type: ReminderType;
  channel: string;
  message_template: string;
  days_offset: number;
  is_active: boolean;
};

export default function NotificationTemplatesPage() {
  const supabase = createClient();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      return;
    }

    setBusinessId(profile.business_id);

    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('days_offset');

    setTemplates(data ?? []);

    setLoading(false);
  }

  async function saveTemplate(template: Template) {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('notification_templates')
      .update({
        message_template: template.message_template,
        days_offset: template.days_offset,
        is_active: template.is_active,
      })
      .eq('id', template.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setMessage('Template updated successfully.');
  }

  function updateTemplate(
    index: number,
    field: keyof Template,
    value: any
  ) {
    const copy = [...templates];

    copy[index] = {
      ...copy[index],
      [field]: value,
    };

    setTemplates(copy);
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading templates...
      </div>
    );
  }

  return (
    <div className="max-w-5xl p-6 space-y-6">

      <div>

        <h1 className="text-3xl font-bold">
          Notification Templates
        </h1>

        <p className="text-gray-500">
          Customize automatic SMS reminders.
        </p>

      </div>

      {message && (
        <div className="rounded-md border bg-green-50 p-3 text-green-700">
          {message}
        </div>
      )}

      {templates.map((template, index) => (

        <div
          key={template.id}
          className="rounded-lg border bg-white p-6 shadow-sm space-y-4"
        >

          <div className="flex items-center justify-between">

            <h2 className="text-lg font-semibold capitalize">
              {template.type.replace('_', ' ')}
            </h2>

            <label className="flex items-center gap-2">

              <input
                type="checkbox"
                checked={template.is_active}
                onChange={(e) =>
                  updateTemplate(
                    index,
                    'is_active',
                    e.target.checked
                  )
                }
              />

              Active

            </label>

          </div>

          <div>

            <label className="block mb-2 text-sm font-medium">
              Days Offset
            </label>

            <input
              type="number"
              value={template.days_offset}
              onChange={(e) =>
                updateTemplate(
                  index,
                  'days_offset',
                  Number(e.target.value)
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />

            <p className="mt-1 text-xs text-gray-500">
              Example: -2 = two days before due date, 0 = due date, 3 = three days after.
            </p>

          </div>

          <div>

            <label className="block mb-2 text-sm font-medium">
              SMS Message
            </label>

            <textarea
              rows={7}
              value={template.message_template}
              onChange={(e) =>
                updateTemplate(
                  index,
                  'message_template',
                  e.target.value
                )
              }
              className="w-full rounded-md border px-3 py-2"
            />

          </div>

          <div className="rounded-md bg-gray-50 p-3 text-sm">

            <p className="font-semibold mb-2">
              Available Variables
            </p>

            <div className="grid grid-cols-2 gap-2 text-gray-600">

              <span>{'{customer_name}'}</span>

              <span>{'{business_name}'}</span>

              <span>{'{balance}'}</span>

              <span>{'{amount}'}</span>

              <span>{'{description}'}</span>

              <span>{'{due_date}'}</span>

              <span>{'{payment_instructions}'}</span>

            </div>

          </div>

          <button
            onClick={() => saveTemplate(template)}
            disabled={saving}
            className="rounded-md bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>

        </div>

      ))}

    </div>
  );
}