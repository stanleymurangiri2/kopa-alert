import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SuperAdminRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-md">
        Access Denied: Super Admin permissions required.
      </div>
    );
  }

  const { data: requests } = await supabase
    .from('business_requests')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Onboarding Requests</h1>
          <p className="text-sm text-gray-500">Manage business access, approvals, and suspensions</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Business</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Requested Date</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {requests && requests.length > 0 ? (
              requests.map((req) => (
                <tr key={req.id}>
                  <td className="px-6 py-4 font-semibold text-gray-900">{req.business_name}</td>
                  <td className="px-6 py-4 text-gray-700">{req.owner_name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{req.phone}</div>
                    <div className="text-xs text-gray-400">{req.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        req.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : req.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : req.status === 'suspended'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <form action="/api/admin/requests" method="POST" className="inline-block">
                      <input type="hidden" name="requestId" value={req.id} />
                      {req.status === 'pending' && (
                        <>
                          <button
                            formAction={async () => {
                              'use server';
                              const { createClient } = await import('@/lib/supabase/server');
                              const supabase = await createClient();
                              await supabase.from('businesses').insert([
                                {
                                  business_name: req.business_name,
                                  phone: req.phone,
                                  email: req.email,
                                  status: 'approved',
                                },
                              ]);
                              await supabase
                                .from('business_requests')
                                .update({ status: 'approved' })
                                .eq('id', req.id);
                            }}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded"
                          >
                            Approve
                          </button>
                          <button
                            formAction={async () => {
                              'use server';
                              const { createClient } = await import('@/lib/supabase/server');
                              const supabase = await createClient();
                              await supabase
                                .from('business_requests')
                                .update({ status: 'rejected' })
                                .eq('id', req.id);
                            }}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded ml-1"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          formAction={async () => {
                            'use server';
                            const { createClient } = await import('@/lib/supabase/server');
                            const supabase = await createClient();
                            await supabase
                              .from('business_requests')
                              .update({ status: 'suspended' })
                              .eq('id', req.id);
                            await supabase
                              .from('businesses')
                              .update({ status: 'suspended' })
                              .eq('email', req.email);
                          }}
                          className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-medium py-1 px-3 rounded"
                        >
                          Suspend
                        </button>
                      )}
                      {req.status === 'suspended' && (
                        <button
                          formAction={async () => {
                            'use server';
                            const { createClient } = await import('@/lib/supabase/server');
                            const supabase = await createClient();
                            await supabase
                              .from('business_requests')
                              .update({ status: 'approved' })
                              .eq('id', req.id);
                            await supabase
                              .from('businesses')
                              .update({ status: 'approved' })
                              .eq('email', req.email);
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded"
                        >
                          Activate
                        </button>
                      )}
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No registration requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}