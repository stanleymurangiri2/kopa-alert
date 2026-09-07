"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

export default function SubscriptionControl({
  businessId,
  tier,
  status,
  price,
  expiresAt,
}: {
  businessId: string;
  tier: string | null;
  status: string | null;
  price: number | null;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const locked = status === "locked";
  const isLifetime = tier === "lifetime";

  const [paymentType, setPaymentType] = useState<"monthly" | "one_time">("monthly");
  const [amount, setAmount] = useState(String(price ?? 1500));
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showToast("error", "Enter a valid amount greater than 0.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/businesses/${businessId}/subscription-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parsed,
            payment_method: paymentMethod,
            payment_type: paymentType,
            reference: reference.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to record payment.");
      }

      if (result.emailSent === false) {
        showToast(
          "error",
          "Payment recorded, but the invoice/receipt email failed to send."
        );
      } else if (paymentType === "one_time") {
        showToast("success", "One-time payment recorded — business now has lifetime access.");
      } else {
        showToast("success", "Payment recorded and invoice/receipt emailed.");
      }

      setReference("");
      router.refresh();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Unable to record payment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function unlockWithoutPayment() {
    if (!confirm("Unlock this business without recording a payment?")) return;

    setUnlocking(true);

    try {
      const response = await fetch(
        `/api/admin/businesses/${businessId}/subscription-unlock`,
        { method: "POST" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to unlock business.");
      }

      showToast("success", "Business unlocked.");
      router.refresh();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Unable to unlock business."
      );
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="mt-2 space-y-3">
      {locked && (
        <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <span className="text-sm font-medium text-destructive">
            Account locked — subscription lapsed on{" "}
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : "unknown date"}.
          </span>
          <button
            type="button"
            onClick={unlockWithoutPayment}
            disabled={unlocking}
            className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground underline hover:text-foreground disabled:opacity-50"
          >
            {unlocking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Unlock without payment
          </button>
        </div>
      )}

      {!isLifetime && tier !== "free" && expiresAt && !locked && (
        <p className="text-xs text-muted-foreground">
          Renews on {new Date(expiresAt).toLocaleDateString()}.
        </p>
      )}

      {isLifetime ? (
        <p className="rounded-md border border-success/30 bg-success/10 p-3 text-sm font-medium text-success">
          Lifetime access granted — no further subscription payments required.
        </p>
      ) : (
        <form onSubmit={recordPayment} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Payment Type
            </label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as "monthly" | "one_time")}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="monthly">Monthly Subscription</option>
              <option value="one_time">One-Time (Lifetime)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Amount (KES)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Reference (optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="M-Pesa code, slip #..."
              className="w-40 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-teal px-3 py-1.5 text-xs font-medium text-teal-foreground hover:bg-teal/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {paymentType === "one_time" ? "Record One-Time Payment" : "Record Payment"}
          </button>
        </form>
      )}
    </div>
  );
}
