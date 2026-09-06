"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SmsBalanceControl({
  businessId,
  balance,
}: {
  businessId: string;
  balance: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function adjustBalance(direction: 1 | -1) {
    const parsed = Number(amount);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setMessage({ type: "error", text: "Enter a whole number greater than 0." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/sms-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed * direction }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to update SMS balance.");
      }

      setMessage({
        type: "success",
        text: `Balance updated to ${result.business.sms_balance.toLocaleString()}.`,
      });
      setAmount("");
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to update SMS balance.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2">
      {balance <= 0 && (
        <p className="mb-2 text-xs font-medium text-destructive">
          Balance depleted — this business's SMS reminders will not send until topped up.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-28 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
        />

        <button
          type="button"
          onClick={() => adjustBalance(1)}
          disabled={saving}
          className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
        >
          Add
        </button>

        <button
          type="button"
          onClick={() => adjustBalance(-1)}
          disabled={saving}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          Deduct
        </button>
      </div>

      {message && (
        <p
          className={`mt-2 text-xs ${
            message.type === "success" ? "text-success" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
