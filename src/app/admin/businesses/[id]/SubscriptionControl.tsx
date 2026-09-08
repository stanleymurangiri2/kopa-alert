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
  onetimeFeePaidAt,
  onetimeFeeAmount,
}: {
  businessId: string;
  tier: string | null;
  status: string | null;
  price: number | null;
  expiresAt: string | null;
  onetimeFeePaidAt: string | null;
  onetimeFeeAmount: number | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const locked = status === "locked";

  async function unlockWithoutPayment() {
    if (!confirm("Unlock this business without recording a payment?")) return;

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
    }
  }

  return (
    <div className="mt-2 space-y-4">
      {locked && (
        <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <span className="text-sm font-medium text-destructive">
            Account locked — subscription lapsed on{" "}
            {expiresAt ? new Date(expiresAt).toLocaleDateString() : "unknown date"}.
          </span>
          <UnlockButton onUnlock={unlockWithoutPayment} />
        </div>
      )}

      {tier !== "free" && expiresAt && !locked && (
        <p className="text-xs text-muted-foreground">
          Renews on {new Date(expiresAt).toLocaleDateString()}.
        </p>
      )}

      <OneTimeFeeSection
        businessId={businessId}
        onetimeFeePaidAt={onetimeFeePaidAt}
        onetimeFeeAmount={onetimeFeeAmount}
      />

      <MonthlySubscriptionSection businessId={businessId} price={price} />
    </div>
  );
}

function UnlockButton({ onUnlock }: { onUnlock: () => void }) {
  const [unlocking, setUnlocking] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setUnlocking(true);
        try {
          await onUnlock();
        } finally {
          setUnlocking(false);
        }
      }}
      disabled={unlocking}
      className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground underline hover:text-foreground disabled:opacity-50"
    >
      {unlocking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Unlock without payment
    </button>
  );
}

function OneTimeFeeSection({
  businessId,
  onetimeFeePaidAt,
  onetimeFeeAmount,
}: {
  businessId: string;
  onetimeFeePaidAt: string | null;
  onetimeFeeAmount: number | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

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
            payment_type: "one_time",
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
      } else {
        showToast("success", "One-time system fee recorded and receipt emailed.");
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

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold text-foreground">
        One-Time System Fee
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Covers the right to use the system. Separate from the monthly fee below.
      </p>

      {onetimeFeePaidAt ? (
        <p className="rounded-md border border-success/30 bg-success/10 p-2 text-sm font-medium text-success">
          Paid on {new Date(onetimeFeePaidAt).toLocaleDateString()}
          {onetimeFeeAmount != null
            ? ` — KES ${Number(onetimeFeeAmount).toLocaleString()}`
            : ""}
        </p>
      ) : (
        <form onSubmit={recordPayment} className="flex flex-wrap items-end gap-2">
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
            Record One-Time Payment
          </button>
        </form>
      )}
    </div>
  );
}

function MonthlySubscriptionSection({
  businessId,
  price,
}: {
  businessId: string;
  price: number | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [amount, setAmount] = useState(String(price ?? 1500));
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

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
            payment_type: "monthly",
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

  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 text-sm font-semibold text-foreground">
        Monthly Subscription
      </p>
      <p className="mb-3 text-xs text-muted-foreground">
        Covers ongoing maintenance and services like SMS. Recurring every 30 days.
      </p>

      <form onSubmit={recordPayment} className="flex flex-wrap items-end gap-2">
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
          Record Payment
        </button>
      </form>
    </div>
  );
}
