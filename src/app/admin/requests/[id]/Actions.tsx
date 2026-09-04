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
    if (loading) return;

    const confirmed = confirm(
      "Approve this business registration?\n\nA KopaAlert account will be created for the business owner."
    );

    if (!confirmed) return;

    setLoading(true);

    try {
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

      if (!response.ok) {
        throw new Error(result.error ?? "Approval failed.");
      }

      alert(
        "Business approved successfully. The owner can now use the KopaAlert account."
      );

      router.push("/admin/requests");
      router.refresh();
    } catch (error) {
      console.error("Approval error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Approval failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function rejectBusiness() {
    if (loading) return;

    const confirmed = confirm(
      "Reject this business registration?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Rejection failed.");
      }

      alert("Registration rejected successfully.");

      router.push("/admin/requests");
      router.refresh();
    } catch (error) {
      console.error("Rejection error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Rejection failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4">
      <button
        onClick={approveBusiness}
        disabled={loading}
        className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve Business"}
      </button>

      <button
        onClick={rejectBusiness}
        disabled={loading}
        className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reject Business
      </button>
    </div>
  );
}
