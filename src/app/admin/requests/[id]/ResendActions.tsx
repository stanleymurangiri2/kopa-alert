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

  const MAX_RESENDS = 3;
  const remaining = Math.max(0, MAX_RESENDS - resendCount);

  async function resendInvitation() {
    const confirmed = confirm(
      `Resend the approval invitation?\n\nA new temporary password will be generated and sent to the business email address.`
    );

    if (!confirmed || loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/requests/${requestId}/resend`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.error ?? "Resend failed.");
        return;
      }

      alert(
        `Invitation resent successfully.\n\nRemaining attempts: ${result.remaining}`
      );

      router.refresh();
    } catch (error) {
      console.error("Resend request failed:", error);
      alert("Unable to resend the invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (remaining <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Resend limit reached ({resendCount}/{MAX_RESENDS}).
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={resendInvitation}
        disabled={loading}
        className="rounded-md border border-warning px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Sending..."
          : `Resend Invitation (${remaining} left)`}
      </button>
    </div>
  );
}
