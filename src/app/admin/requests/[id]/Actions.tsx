"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PendingAction = "approve" | "reject";

export default function Actions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  async function approveBusiness() {
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

  async function confirmPendingAction() {
    const action = pendingAction;
    setPendingAction(null);

    if (action === "approve") {
      await approveBusiness();
    } else if (action === "reject") {
      await rejectBusiness();
    }
  }

  return (
    <>
      <div className="flex gap-4">
        <button
          onClick={() => setPendingAction("approve")}
          disabled={loading}
          className="rounded-lg bg-success px-6 py-3 text-success-foreground hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Processing..." : "Approve Business"}
        </button>

        <button
          onClick={() => setPendingAction("reject")}
          disabled={loading}
          className="rounded-lg bg-destructive px-6 py-3 text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject Business
        </button>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              {pendingAction === "approve"
                ? "Approve this business?"
                : "Reject this registration?"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingAction === "approve"
                ? "A KopaAlert account will be created for the business owner and they'll be emailed their login details."
                : "This cannot be undone. The applicant will need to submit a new registration to be reconsidered."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingAction}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  pendingAction === "approve"
                    ? "bg-success text-success-foreground hover:bg-success/90"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
              >
                {pendingAction === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
