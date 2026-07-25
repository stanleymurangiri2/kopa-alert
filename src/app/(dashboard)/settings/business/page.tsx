'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Business, BusinessSettings } from '@/types/database.types';

export default function BusinessSettingsPage() {
  const [business, setBusiness] = useState<Partial<Business>>({
    business_name: '',
    phone: '',
    email: '',
  });
  const [settings, setSettings] = useState<Partial<BusinessSettings>>({
    default_currency: 'KES',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadBusiness() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('business_id, businesses(*)')
        .eq('id', user.id)
        .single();

      const businessRecord = Array.isArray(profile?.businesses)
        ? profile?.businesses[0]
        : profile?.businesses;

      if (businessRecord) {
        setBusiness(businessRecord);
      }

      if (profile?.business_id) {
        const { data: settingsData } = await supabase
          .from('business_settings')
          .select('*')
          .eq('business_id', profile.business_id)
          .single();

        if (settingsData) setSettings(settingsData);
      }

      setLoading(false);
    }
    loadBusiness();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error: businessError } = await supabase
      .from('businesses')
      .update({
        business_name: business.business_name,
        phone: business.phone,
        email: business.email,
      })
      .eq('id', business.id!);

    const { error: settingsError } = await supabase
      .from('business_settings')
      .update({
        default_currency: settings.default_currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id!);

    setSaving(false);

    if (businessError || settingsError) {
      setMessage({ type: 'error', text: (businessError || settingsError)!.message });
    } else {
      setMessage({ type: 'success', text: 'Business details saved successfully!' });
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Details</h1>
        <p className="text-sm text-gray-500">Manage your business profile and operational defaults</p>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Business Name</label>
          <input
            type="text"
            required
            value={business.business_name || ''}
            onChange={(e) => setBusiness({ ...business, business_name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Phone</label>
          <input
            type="text"
            required
            value={business.phone || ''}
            onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Email</label>
          <input
            type="email"
            required
            value={business.email || ''}
            onChange={(e) => setBusiness({ ...business, email: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Default Currency</label>
          <select
            value={settings.default_currency}
            onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="KES">KES - Kenyan Shilling</option>
            <option value="USD">USD - US Dollar</option>
            <option value="UGX">UGX - Ugandan Shilling</option>
            <option value="TZS">TZS - Tanzanian Shilling</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
