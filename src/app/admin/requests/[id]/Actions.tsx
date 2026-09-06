"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type PendingAction = "approve" | "reject";

export default function Actions({
  requestId,
}: {
  requestId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function approveBusiness() {
    setLoading(true);
    setMessage(null);

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

      if (result.emailSent === false) {
        setMessage({
          type: "error",
          text: "Business approved, but the approval email failed to send. The owner won't have their login details - refresh this page and use Resend Invitation, or share credentials manually.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Business approved successfully. The owner can now use the KopaAlert account.",
        });
      }

      setCompleted(true);
    } catch (error) {
      console.error("Approval error:", error);

      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Approval failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function rejectBusiness() {
    setLoading(true);
    setMessage(null);

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

      if (result.emailSent === false) {
        setMessage({
          type: "error",
          text: "Registration rejected, but the notification email failed to send. The applicant won't be told automatically - consider contacting them directly.",
        });
      } else {
        setMessage({ type: "success", text: "Registration rejected successfully." });
      }

      setCompleted(true);
    } catch (error) {
      console.error("Rejection error:", error);

      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Rejection failed. Please try again.",
      });
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
      {message && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {completed ? (
        <Link href="/admin/requests" className="text-sm text-primary hover:underline">
          Back to Requests
        </Link>
      ) : (
        <div className="flex gap-4">
          <button
            onClick={() => setPendingAction("approve")}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-success px-6 py-3 text-success-foreground hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Approve Business"}
          </button>

          <button
            onClick={() => setPendingAction("reject")}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-6 py-3 text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reject Business
          </button>
        </div>
      )}

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
