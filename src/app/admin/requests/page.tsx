'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface BusinessRequest {
  id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

type PendingAction = {
  type: 'approve' | 'reject';
  request: BusinessRequest;
};

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  pending: 'bg-warning/10 text-warning',
};

export default function AdminRequestsPage() {
  const supabase = createClient();

  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('business_requests')
      .select(
        'id, business_name, owner_name, phone, email, status, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load business requests:', error);
      setError('Failed to load business requests. Please refresh and try again.');
      setRequests([]);
    } else {
      setRequests(data ?? []);
    }

    setLoading(false);
  }

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );

  async function approveRequest(requestId: string) {
    setProcessing(requestId);
    setError('');

    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Approval failed.');
      }

      alert(
        'Business approved successfully. The owner can now access the KopaAlert account.'
      );

      await loadRequests();
    } catch (err) {
      console.error('Approval error:', err);

      alert(
        err instanceof Error
          ? err.message
          : 'Approval failed. Please try again.'
      );
    } finally {
      setProcessing(null);
    }
  }

  async function rejectRequest(requestId: string) {
    setProcessing(requestId);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Rejection failed.');
      }

      alert('Business request rejected successfully.');

      await loadRequests();
    } catch (err) {
      console.error('Rejection error:', err);

      alert(
        err instanceof Error
          ? err.message
          : 'Rejection failed. Please try again.'
      );
    } finally {
      setProcessing(null);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;

    const { type, request } = pendingAction;
    setPendingAction(null);

    if (type === 'approve') {
      await approveRequest(request.id);
    } else {
      await rejectRequest(request.id);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading business requests...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Pending Approvals
          {pendingCount > 0 && (
            <span className="ml-2 text-2xl font-normal text-muted-foreground">
              ({pendingCount})
            </span>
          )}
        </h1>

        <p className="text-muted-foreground mt-1">
          Review and approve new business registrations.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-primary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Business
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No business requests found.
                </td>
              </tr>
            ) : (
              requests.map((request, i) => {
                const isProcessing = processing === request.id;

                return (
                  <tr
                    key={request.id}
                    className={`border-t border-border transition-colors hover:bg-accent ${
                      i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                    }`}
                  >
                    <td className="px-4 py-3 text-[15px] font-semibold text-foreground">
                      {request.business_name}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {request.owner_name}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {request.email}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {request.phone}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          STATUS_STYLES[request.status] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(
                        request.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      {request.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setPendingAction({ type: 'approve', request })
                            }
                            disabled={processing !== null}
                            className="rounded-md bg-success px-4 py-1.5 text-xs font-medium text-success-foreground hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? 'Processing...'
                              : 'Approve'}
                          </button>

                          <button
                            onClick={() =>
                              setPendingAction({ type: 'reject', request })
                            }
                            disabled={processing !== null}
                            className="rounded-md bg-destructive px-4 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              {pendingAction.type === 'approve'
                ? 'Approve this business?'
                : 'Reject this request?'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingAction.type === 'approve' ? (
                <>
                  A KopaAlert account will be created for{' '}
                  <span className="font-medium text-foreground">
                    {pendingAction.request.business_name}
                  </span>{' '}
                  and the owner will be emailed their login details.
                </>
              ) : (
                <>
                  Are you sure you want to reject the registration request
                  from{' '}
                  <span className="font-medium text-foreground">
                    {pendingAction.request.business_name}
                  </span>
                  ? This cannot be undone.
                </>
              )}
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
                  pendingAction.type === 'approve'
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                }`}
              >
                {pendingAction.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
