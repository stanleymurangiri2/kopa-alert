'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = use(params);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadCustomer() {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !data) {
        setError('Customer not found or access denied.');
      } else {
        setFormData({
          full_name: data.full_name,
          phone: data.phone,
          email: data.email || '',
        });
      }
      setLoading(false);
    }

    loadCustomer();
  }, [customerId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/customers');
    router.refresh();
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading customer details...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
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
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}