"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Actions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateBusiness(nextStatus: string) {
    if (loading) return;

    const action =
      nextStatus === "suspended"
        ? "suspend"
        : "activate";

    const confirmed = confirm(
      `Are you sure you want to ${action} this business?`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/businesses/status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            status: nextStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to update business."
        );
      }

      alert(
        nextStatus === "suspended"
          ? "Business suspended successfully."
          : "Business activated successfully."
      );

      router.refresh();
    } catch (error) {
      console.error("Business status update error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update business."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4">
      {status === "approved" && (
        <button
          onClick={() => updateBusiness("suspended")}
          disabled={loading}
          className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Processing..." : "Suspend Business"}
        </button>
      )}

      {status === "suspended" && (
        <button
          onClick={() => updateBusiness("approved")}
          disabled={loading}
          className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Processing..." : "Activate Business"}
        </button>
      )}
    </div>
  );
}
