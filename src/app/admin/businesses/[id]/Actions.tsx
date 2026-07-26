"use client";

import { useRouter } from "next/navigation";

export default function Actions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();

  async function updateBusiness(nextStatus: string) {
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

    if (!response.ok) {
      alert("Unable to update business.");
      return;
    }

    alert("Business updated.");

    router.refresh();
  }

  return (
    <div className="flex gap-4">

      {status === "approved" && (

        <button
          onClick={() => updateBusiness("suspended")}
          className="rounded-lg bg-red-600 px-6 py-3 text-white"
        >
          Suspend Business
        </button>

      )}

      {status === "suspended" && (

        <button
          onClick={() => updateBusiness("approved")}
          className="rounded-lg bg-green-600 px-6 py-3 text-white"
        >
          Activate Business
        </button>

      )}

    </div>
  );
}