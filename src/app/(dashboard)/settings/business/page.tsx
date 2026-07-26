'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Business = {
  id: string;
  business_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
};

export default function BusinessSettingsPage() {
  const supabase = createClient();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', profile.business_id)
        .single();

      if (data) {
        setBusiness(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();

    if (!business) return;

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('businesses')
      .update({
        business_name: business.business_name,
        phone: business.phone,
        email: business.email,
      })
      .eq('id', business.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage('Business information updated successfully.');
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading business information...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6">
        Business information not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Business Settings
        </h1>

        <p className="text-gray-500">
          Manage your business information.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-md border bg-gray-50 p-3 text-sm">
          {message}
        </div>
      )}

      <form
        onSubmit={saveBusiness}
        className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
      >

        <div>
          <label className="block text-sm font-medium">
            Business Name
          </label>

          <input
            type="text"
            value={business.business_name}
            onChange={(e) =>
              setBusiness({
                ...business,
                business_name: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Phone Number
          </label>

          <input
            type="text"
            value={business.phone}
            onChange={(e) =>
              setBusiness({
                ...business,
                phone: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Business Email
          </label>

          <input
            type="email"
            value={business.email}
            onChange={(e) =>
              setBusiness({
                ...business,
                email: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Status
          </label>

          <input
            type="text"
            value={business.status}
            readOnly
            className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Registered On
          </label>

          <input
            type="text"
            value={new Date(
              business.created_at
            ).toLocaleString()}
            readOnly
            className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : 'Save Changes'}
        </button>

      </form>

    </div>
  );
}