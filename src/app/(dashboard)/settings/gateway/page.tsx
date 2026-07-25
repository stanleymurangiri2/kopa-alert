'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BusinessSettings } from '@/types/database.types';

export default function GatewaySettingsPage() {
  const [settings, setSettings] = useState<Partial<BusinessSettings>>({
    sms_provider: 'africastalking',
    api_key: '',
    api_username: '',
    sender_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('business_settings').select('*').single();
      if (data) {
        setSettings(data);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('business_settings')
      .update({
        sms_provider: settings.sms_provider,
        api_key: settings.api_key,
        api_username: settings.api_username,
        sender_id: settings.sender_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id!);

    setSaving(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Gateway credentials saved successfully!' });
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SMS Gateway Credentials</h1>
        <p className="text-sm text-gray-500">Configure your Africa's Talking API keys for automated dispatch</p>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Provider</label>
          <select
            value={settings.sms_provider}
            onChange={(e) => setSettings({ ...settings, sms_provider: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="africastalking">Africa's Talking</option>
            <option value="twilio">Twilio (Coming Soon)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">API Username</label>
          <input
            type="text"
            required
            placeholder="e.g. sandbox or mycompany"
            value={settings.api_username || ''}
            onChange={(e) => setSettings({ ...settings, api_username: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">API Key</label>
          <input
            type="password"
            required
            value={settings.api_key || ''}
            onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Sender ID (Optional)</label>
          <input
            type="text"
            placeholder="e.g. KOPAALERT"
            value={settings.sender_id || ''}
            onChange={(e) => setSettings({ ...settings, sender_id: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}