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
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);

    const { data, error } = await supabase
      .from('business_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }

    setLoading(false);
  }

  async function approveRequest(requestId: string) {
    setProcessing(requestId);

    const response = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
      }),
    });

    const result = await response.json();

    setProcessing(null);

    if (!response.ok) {
      alert(result.error || 'Approval failed.');
      return;
    }

    alert('Business approved successfully. Login credentials have been emailed to the owner.');

    loadRequests();
  }

  async function rejectRequest(requestId: string) {
    if (!confirm('Reject this registration request?')) {
      return;
    }

    const response = await fetch(`/api/admin/requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || 'Rejection failed.');
      return;
    }

    alert('Business request rejected.');

    loadRequests();
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading business requests...
      </div>
    );
  }

  return (
    <div className="max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Business Registration Requests
        </h1>

        <p className="text-gray-500">
          Review and approve new business registrations.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Business</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No business requests found.
                </td>
              </tr>
            )}

            {requests.map((request) => (
              <tr key={request.id} className="border-t">
                <td className="px-4 py-3">{request.business_name}</td>
                <td className="px-4 py-3">{request.owner_name}</td>
                <td className="px-4 py-3">{request.email}</td>
                <td className="px-4 py-3">{request.phone}</td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
                  {new Date(request.created_at).toLocaleDateString()}
                </td>

                <td className="px-4 py-3">
                  {request.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveRequest(request.id)}
                        disabled={processing === request.id}
                        className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700"
                      >
                        {processing === request.id ? 'Approving...' : 'Approve'}
                      </button>

                      <button
                        onClick={() => rejectRequest(request.id)}
                        className="rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500">Processed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}