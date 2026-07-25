import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { q: searchQuery } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let query = supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (searchQuery) {
    query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
  }

  const { data: customers, error } = await query;

  async function deleteCustomer(formData: FormData) {
    'use server';
    const customerId = formData.get('customerId') as string;
    const supabase = await createClient();

    await supabase.from('customers').delete().eq('id', customerId);
    revalidatePath('/customers');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">Manage customer list and profiles for your business</p>
        </div>
        <Link
          href="/customers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-md shadow-sm"
        >
          + Add New Customer
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <form method="GET" action="/customers" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery || ''}
            placeholder="Search by name or phone number..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md"
          >
            Search
          </button>
          {searchQuery && (
            <Link
              href="/customers"
              className="px-4 py-2 bg-gray-50 text-gray-500 text-sm font-medium rounded-md hover:underline flex items-center"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Full Name</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Phone Number</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Date Added</th>
              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {error && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-red-600">
                  Failed to load customers: {error.message}
                </td>
              </tr>
            )}
            {customers && customers.length > 0 ? (
              customers.map((cust) => (
                <tr key={cust.id}>
                  <td className="px-6 py-4 font-semibold text-gray-900">{cust.full_name}</td>
                  <td className="px-6 py-4 text-gray-700">{cust.phone}</td>
                  <td className="px-6 py-4 text-gray-500">{cust.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(cust.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <Link
                      href={`/customers/${cust.id}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteCustomer} className="inline-block">
                      <input type="hidden" name="customerId" value={cust.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No customers found. Click "+ Add New Customer" to record your first customer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}