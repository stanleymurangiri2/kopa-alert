'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getCustomers } from '@/lib/supabase/customers';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  is_blacklisted?: boolean | null;
  rating?: string | null;
};

const RATING_ORDER: Record<string, number> = {
  Excellent: 0,
  Good: 1,
  Fair: 2,
  Poor: 3,
  Blacklisted: 4,
};

function RatingBadge({ rating }: { rating?: string | null }) {
  if (!rating) {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
        Not rated yet
      </span>
    );
  }

  const styles: Record<string, string> = {
    Excellent: 'bg-green-100 text-green-700',
    Good: 'bg-blue-100 text-blue-700',
    Fair: 'bg-amber-100 text-amber-700',
    Poor: 'bg-orange-100 text-orange-700',
    Blacklisted: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[rating] ?? 'bg-gray-100 text-gray-700'}`}>
      {rating}
    </span>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortByRating, setSortByRating] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    const { data } = await getCustomers();
    setCustomers((data ?? []) as Customer[]);
    setLoading(false);
  }

  const displayedCustomers = useMemo(() => {
    if (!sortByRating) return customers;

    return [...customers].sort((a, b) => {
      const aRank = a.rating ? RATING_ORDER[a.rating] ?? 99 : 98;
      const bRank = b.rating ? RATING_ORDER[b.rating] ?? 99 : 98;
      return aRank - bRank;
    });
  }, [customers, sortByRating]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500">Manage your customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={sortByRating}
              onChange={(e) => setSortByRating(e.target.checked)}
            />
            Sort by payment rating
          </label>
          <Link
            href="/customers/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + New Customer
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-center">Loading customers...</div>
        ) : displayedCustomers.length === 0 ? (
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
                <th className="px-4 py-3 text-left">Payment rating</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {customer.full_name}
                  </td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">
                    {customer.email ?? 'N/A'}
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
                  <td className="px-4 py-3">
                    <RatingBadge rating={customer.rating} />
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
