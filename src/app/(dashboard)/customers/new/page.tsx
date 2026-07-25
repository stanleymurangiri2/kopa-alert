'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCustomerPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Fetch user profile to bind the customer to the user's business_id
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      setError('Could not retrieve user business identity.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('customers').insert([
      {
        business_id: profile.business_id,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
      },
    ]);

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push('/customers');
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
        <Link href="/customers" className="text-sm text-gray-500 hover:underline">
          ← Cancel
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Mary Wanjiku"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="+254712345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="mary@example.com"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving Customer...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}