"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { Loader2 } from "lucide-react";

export default function Actions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const { showToast } = useToast();

  async function updateBusiness(nextStatus: string) {
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

      const actionLabel = nextStatus === "suspended" ? "suspended" : "activated";

      if (result.emailSent === false) {
        showToast(
          "error",
          `Business ${actionLabel} successfully, but the notification email failed to send - the business owner won't know their access changed unless you tell them directly.`
        );
      } else {
        showToast("success", `Business ${actionLabel} successfully.`);
      }

      router.refresh();
    } catch (error) {
      console.error("Business status update error:", error);
      showToast("error", error instanceof Error ? error.message : "Unable to update business.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPendingStatus() {
    const nextStatus = pendingStatus;
    setPendingStatus(null);

    if (nextStatus) {
      await updateBusiness(nextStatus);
    }
  }

  const isSuspending = pendingStatus === "suspended";

  return (
    <>
      <div className="flex gap-4">
        {status === "approved" && (
          <button
            onClick={() => setPendingStatus("suspended")}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-6 py-3 text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Suspend Business"}
          </button>
        )}

        {status === "suspended" && (
          <button
            onClick={() => setPendingStatus("approved")}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-success px-6 py-3 text-success-foreground hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Activate Business"}
          </button>
        )}
      </div>

      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              {isSuspending ? "Suspend this business?" : "Activate this business?"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSuspending
                ? "The business owner and their team will lose access to their KopaAlert account until it's reactivated."
                : "The business owner and their team will regain access to their KopaAlert account."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingStatus}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  isSuspending
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-success text-success-foreground hover:bg-success/90"
                }`}
              >
                {isSuspending ? "Suspend" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
