"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Actions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function approveBusiness() {
    setLoading(true);

    const response = await fetch("/api/admin/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
      }),
    });

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      alert(result.error ?? "Approval failed.");
      return;
    }

    alert("Business approved successfully. Login credentials have been emailed to the owner.");

    router.push("/admin/requests");
    router.refresh();
  }

  async function rejectBusiness() {
    const confirmed = confirm("Reject this registration?");

    if (!confirmed) return;

    setLoading(true);

    const response = await fetch(
      `/api/admin/requests/${requestId}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
        }),
      }
    );

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      alert(result.error ?? "Reject failed.");
      return;
    }

    alert("Registration rejected.");

    router.push("/admin/requests");
    router.refresh();
  }

  return (
    <div className="flex gap-4">
      <button
        onClick={approveBusiness}
        disabled={loading}
        className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve Business"}
      </button>

      <button
        onClick={rejectBusiness}
        disabled={loading}
        className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:opacity-50"
      >
        Reject Business
      </button>
    </div>
  );
}