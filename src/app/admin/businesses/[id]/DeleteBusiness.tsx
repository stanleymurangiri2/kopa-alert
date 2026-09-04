"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Counts = {
  customers: number;
  debts: number;
  payments: number;
  notifications: number;
  users: number;
};

export default function DeleteBusiness({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirming">("idle");
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);

    const response = await fetch(
      `/api/admin/businesses/${businessId}/delete-preview`,
    );
    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to load business data.");
      return;
    }

    setCounts(result.counts);
    setStep("confirming");
  }

  async function confirmDelete() {
    setLoading(true);
    setError(null);

    const response = await fetch(
      `/api/admin/businesses/${businessId}/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: confirmText }),
      },
    );

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "Failed to delete business.");
      return;
    }

    alert("Business permanently deleted.");
    router.push("/admin/businesses");
    router.refresh();
  }

  if (step === "idle") {
    return (
      <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800">Danger Zone</h3>
        <p className="mt-1 text-sm text-red-700">
          Permanently delete this business and all of its data. This cannot be undone.
        </p>
        <button
          onClick={loadPreview}
          disabled={loading}
          className="mt-4 rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Delete Business"}
        </button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-lg border border-red-300 bg-red-50 p-6">
      <h3 className="text-lg font-semibold text-red-800">
        Confirm permanent deletion
      </h3>

      <p className="mt-2 text-sm text-red-700">
        This will permanently delete <strong>{businessName}</strong> and all of the following data. This cannot be undone.
      </p>

      {counts && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-800">
          <li>{counts.customers} customer{counts.customers === 1 ? "" : "s"}</li>
          <li>{counts.debts} debt record{counts.debts === 1 ? "" : "s"}</li>
          <li>{counts.payments} payment record{counts.payments === 1 ? "" : "s"}</li>
          <li>{counts.notifications} queued notification{counts.notifications === 1 ? "" : "s"}</li>
          <li>{counts.users} team member account{counts.users === 1 ? "" : "s"} (unlinked, not deleted)</li>
        </ul>
      )}

      <label className="mt-5 block text-sm font-medium text-red-800">
        Type <strong>{businessName}</strong> to confirm:
      </label>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1 w-full rounded-md border border-red-300 px-3 py-2 text-sm"
        placeholder={businessName}
      />

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button
          onClick={confirmDelete}
          disabled={loading || confirmText.trim() !== businessName}
          className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Permanently Delete"}
        </button>
        <button
          onClick={() => {
            setStep("idle");
            setConfirmText("");
            setError(null);
          }}
          disabled={loading}
          className="rounded-lg border px-6 py-3 text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}