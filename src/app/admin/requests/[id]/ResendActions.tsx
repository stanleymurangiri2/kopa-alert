"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResendActions({
  requestId,
  resendCount,
}: {
  requestId: string;
  resendCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const MAX_RESENDS = 3;
  const remaining = Math.max(0, MAX_RESENDS - resendCount);

  async function resendInvitation() {
    setConfirming(false);
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/requests/${requestId}/resend`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: result.error ?? "Resend failed." });
        return;
      }

      setMessage({
        type: "success",
        text: `Invitation resent successfully. Remaining attempts: ${result.remaining}`,
      });

      router.refresh();
    } catch (error) {
      console.error("Resend request failed:", error);
      setMessage({ type: "error", text: "Unable to resend the invitation. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {remaining <= 0 ? (
        <p className="text-sm text-muted-foreground">
          Resend limit reached ({resendCount}/{MAX_RESENDS}).
        </p>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={loading}
          className="rounded-md border border-warning px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending..." : `Resend Invitation (${remaining} left)`}
        </button>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Resend the invitation?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A new temporary password will be generated and sent to the business email address.
              The previous one will stop working.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resendInvitation}
                className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90"
              >
                Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
