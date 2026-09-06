"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export default function AuditRetentionControl({
  retentionDays,
}: {
  retentionDays: number | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [input, setInput] = useState(retentionDays !== null ? String(retentionDays) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "audit_log_retention_days",
          value: input.trim() === "" ? null : input,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save setting.");
      }

      showToast("success", "Retention policy saved.");
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to save setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <label className="mb-1 block text-sm font-medium text-foreground">
        Delete audit logs older than (days)
      </label>
      <p className="mb-2 text-xs text-muted-foreground">
        A daily job permanently deletes audit log entries older than this. Leave empty to keep logs
        forever (no automatic cleanup).
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Keep forever"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
