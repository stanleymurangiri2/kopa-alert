'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCustomers } from '@/lib/supabase/customers';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  is_blacklisted?: boolean | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);

    const { data } = await getCustomers();

    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500">Manage your customers.</p>
        </div>

        <Link
          href="/customers/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + New Customer
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No customers found.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {customer.full_name}
                  </td>

                  <td className="px-4 py-3">{customer.phone}</td>

                  <td className="px-4 py-3">
                    {customer.email ?? '—'}
                  </td>

                  <td className="px-4 py-3">
                    {customer.is_blacklisted ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Blacklisted
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
