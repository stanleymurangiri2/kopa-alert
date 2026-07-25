import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { status: statusFilter } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let query = supabase
    .from('debts')
    .select('*, customers(full_name, phone)')
    .order('due_date', { ascending: true });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: debts, error } = await query;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Records</h1>
          <p className="text-sm text-gray-500">Track outstanding balances, payment terms, and due dates</p>
        </div>
        <Link
          href="/debts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-md shadow-sm"
        >
          + Record New Debt
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 text-sm font-medium">
        {['all', 'pending', 'partially_paid', 'overdue', 'fully_paid'].map((st) => (
          <Link
            key={st}
            href={st === 'all' ? '/debts' : `/debts?status=${st}`}
            className={`px-3 py-1.5 rounded-md capitalize ${
              (statusFilter || 'all') === st
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {st.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {error && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-red-600">
                  Error loading debts: {error.message}
                </td>
              </tr>
            )}
            {debts && debts.length > 0 ? (
              debts.map((debt) => {
                const balance = Number(debt.amount) - Number(debt.amount_paid);
                const isOverdue = debt.due_date < today && debt.status !== 'fully_paid';
                const currentStatus = isOverdue ? 'overdue' : debt.status;

                return (
                  <tr key={debt.id}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {debt.customers?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">{debt.customers?.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{debt.description}</td>
                    <td className="px-6 py-4 font-mono text-gray-900">
                      KES {Number(debt.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-gray-900">
                      KES {balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{debt.due_date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          currentStatus === 'fully_paid'
                            ? 'bg-green-100 text-green-800'
                            : currentStatus === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : currentStatus === 'partially_paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {currentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
  {currentStatus !== 'fully_paid' && (
    <Link
      href={`/debts/${debt.id}/pay`}
      className="text-xs font-semibold text-green-600 hover:underline"
    >
      + Pay
    </Link>
  )}
  <Link
    href={`/debts/${debt.id}`}
    className="text-xs font-medium text-blue-600 hover:underline"
  >
    Edit
  </Link>
</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No debt records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}