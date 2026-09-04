'use client';

import { useEffect, useState } from 'react';
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

export default function AdminRequestsPage() {
  const supabase = createClient();

  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

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

  async function approveRequest(requestId: string) {
    if (processing) return;

    const confirmed = confirm(
      'Approve this business registration request?'
    );

    if (!confirmed) return;

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
    if (processing) return;

    const confirmed = confirm(
      'Reject this registration request?'
    );

    if (!confirmed) return;

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

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Loading business requests...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Business Registration Requests
        </h1>

        <p className="text-gray-500 mt-1">
          Review and approve new business registrations.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Business</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No business requests found.
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const isProcessing = processing === request.id;

                return (
                  <tr
                    key={request.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {request.business_name}
                    </td>

                    <td className="px-4 py-3">
                      {request.owner_name}
                    </td>

                    <td className="px-4 py-3">
                      {request.email}
                    </td>

                    <td className="px-4 py-3">
                      {request.phone}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {new Date(
                        request.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      {request.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              approveRequest(request.id)
                            }
                            disabled={processing !== null}
                            className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing
                              ? 'Processing...'
                              : 'Approve'}
                          </button>

                          <button
                            onClick={() =>
                              rejectRequest(request.id)
                            }
                            disabled={processing !== null}
                            className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">
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
    </div>
  );
}
