import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function PaymentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: payments, error } = await supabase
    .from('payments')
    .select('*, debts(description, customers(full_name, phone))')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500">Audit log of all payments recorded across your business</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Debt Description</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Notes / Ref</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Amount Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {error && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-red-600">
                  Error loading payment log: {error.message}
                </td>
              </tr>
            )}
            {payments && payments.length > 0 ? (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {new Date(payment.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">
                      {payment.debts?.customers?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500">{payment.debts?.customers?.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                    {payment.debts?.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 capitalize font-medium text-gray-800">
                    {payment.payment_method.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-gray-500 italic">
                    {payment.notes || '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-green-700">
                    + KES {Number(payment.amount_paid).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No payment records found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}