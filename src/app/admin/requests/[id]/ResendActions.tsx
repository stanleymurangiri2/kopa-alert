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
  const remaining = MAX_RESENDS - resendCount;

  async function resendInvitation() {
    const confirmed = confirm(
      `Resend the approval invitation with a new temporary password? (${remaining} resend${remaining === 1 ? "" : "s"} left)`
    );

    if (!confirmed) return;

    setLoading(true);

    const response = await fetch(
      `/api/admin/requests/${requestId}/resend`,
      {
        method: "POST",
      }
    );

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      alert(result.error ?? "Resend failed.");
      return;
    }

    alert("Invitation resent with a new temporary password.");

    router.refresh();
  }

  if (remaining <= 0) {
    return (
      <p className="text-sm text-gray-500">
        Resend limit reached ({resendCount}/{MAX_RESENDS}).
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={resendInvitation}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Sending..." : `Resend Invitation (${remaining} left)`}
      </button>
    </div>
  );
}
