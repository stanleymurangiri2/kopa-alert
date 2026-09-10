'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP_URL } from '@/lib/constants/support';

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
  const [loading, setLoading] = useState(true);

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

    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('days_offset');

    setTemplates(data ?? []);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading templates...
      </div>
    );
  }

  return (
    <div className="max-w-5xl p-6 space-y-6">

      <div>

        <h1 className="text-3xl font-bold text-foreground">
          Notification Templates
        </h1>

        <p className="text-muted-foreground">
          Your automatic SMS reminders. These are managed by KopaAlert support to keep
          them consistent and reliable.
        </p>

      </div>

      <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-sm text-info">
        Want different wording? Contact customer support -{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
        {', '}
        <a href={`tel:${SUPPORT_PHONE}`} className="underline">
          {SUPPORT_PHONE}
        </a>
        {', or '}
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="underline">
          WhatsApp
        </a>
        .
      </div>

      {templates.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground shadow-sm">
          No notification templates found for this business.
        </div>
      )}

      {templates.map((template) => (

        <div
          key={template.id}
          className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4"
        >

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold capitalize text-foreground">
                {template.type.replace('_', ' ')}
              </h2>

              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
                {template.channel}
              </span>
            </div>

            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                template.is_active
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {template.is_active ? 'Active' : 'Inactive'}
            </span>

          </div>

          <div>

            <p className="mb-2 text-sm font-medium text-foreground">
              Days Offset
            </p>

            <p className="text-sm text-muted-foreground">
              {template.days_offset}
              {' '}
              <span className="text-xs">
                ({template.days_offset < 0
                  ? `${Math.abs(template.days_offset)} day(s) before due date`
                  : template.days_offset === 0
                    ? 'on the due date'
                    : `${template.days_offset} day(s) after due date`})
              </span>
            </p>

          </div>

          <div>

            <p className="mb-2 text-sm font-medium text-foreground">
              SMS Message
            </p>

            <p className="whitespace-pre-wrap rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
              {template.message_template}
            </p>

          </div>

        </div>

      ))}

    </div>
  );
}
