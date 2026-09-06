"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

export default function ApprovalRulesControl({
  resendLimit,
  autoExpireDays,
}: {
  resendLimit: number;
  autoExpireDays: number | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [resendLimitInput, setResendLimitInput] = useState(String(resendLimit));
  const [savingResendLimit, setSavingResendLimit] = useState(false);

  const [autoExpireInput, setAutoExpireInput] = useState(
    autoExpireDays !== null ? String(autoExpireDays) : ""
  );
  const [savingAutoExpire, setSavingAutoExpire] = useState(false);

  async function saveSetting(
    key: "resend_limit" | "pending_request_auto_expire_days",
    value: string,
    setSaving: (v: boolean) => void
  ) {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value.trim() === "" ? null : value }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save setting.");
      }

      showToast("success", "Setting saved.");
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unable to save setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-5 border-t border-border pt-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Approval invitation resend limit
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          How many times an admin can resend the approval-invitation email for one business.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={resendLimitInput}
            onChange={(e) => setResendLimitInput(e.target.value)}
            className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => saveSetting("resend_limit", resendLimitInput, setSavingResendLimit)}
            disabled={savingResendLimit}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {savingResendLimit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Auto-reject pending requests after (days)
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          If a registration sits pending review for this many days, it's automatically rejected and
          the applicant is notified by email. Leave empty to disable.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Disabled"
            value={autoExpireInput}
            onChange={(e) => setAutoExpireInput(e.target.value)}
            className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() =>
              saveSetting(
                "pending_request_auto_expire_days",
                autoExpireInput,
                setSavingAutoExpire
              )
            }
            disabled={savingAutoExpire}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {savingAutoExpire && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
