"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export type PlatformTemplate = {
  type: "upcoming" | "due_today" | "overdue";
  channel: string;
  message_template: string;
  days_offset: number;
  is_active: boolean;
};

const TYPE_LABELS: Record<PlatformTemplate["type"], string> = {
  upcoming: "Upcoming",
  due_today: "Due Today",
  overdue: "Overdue",
};

function TemplateCard({ template }: { template: PlatformTemplate }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [messageTemplate, setMessageTemplate] = useState(template.message_template);
  const [daysOffset, setDaysOffset] = useState(String(template.days_offset));
  const [isActive, setIsActive] = useState(template.is_active);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings/sms-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: template.type,
          message_template: messageTemplate,
          days_offset: Number(daysOffset),
          is_active: isActive,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save template.");
      }

      showToast(
        "success",
        `Saved - applied to ${result.businessesUpdated} business(es).`
      );
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {TYPE_LABELS[template.type]}
        </h3>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Days Offset
        </label>
        <input
          type="number"
          value={daysOffset}
          onChange={(e) => setDaysOffset(e.target.value)}
          className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          SMS Message
        </label>
        <textarea
          rows={5}
          value={messageTemplate}
          onChange={(e) => setMessageTemplate(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save &amp; Apply to All Businesses
      </button>
    </div>
  );
}

export default function SmsTemplatesControl({
  templates,
}: {
  templates: PlatformTemplate[];
}) {
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground">
        Saving a template here immediately overwrites that message for every
        business - businesses can no longer edit their own wording.
      </p>

      <div className="rounded-md bg-muted p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground">Available Variables</p>
        <div className="grid grid-cols-2 gap-1 font-mono text-muted-foreground sm:grid-cols-3">
          <span>{"{customer_name}"}</span>
          <span>{"{business_name}"}</span>
          <span>{"{balance}"}</span>
          <span>{"{amount}"}</span>
          <span>{"{description}"}</span>
          <span>{"{due_date}"}</span>
          <span>{"{payment_instructions}"}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard key={template.type} template={template} />
        ))}
      </div>
    </div>
  );
}
