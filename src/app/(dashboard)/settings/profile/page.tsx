'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfileSettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (data) setName(data.name || '');
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ name })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile details updated successfully.' });
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Personal Profile</h1>
        <p className="text-sm text-gray-500">Manage your account credentials and personal information</p>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Email Address (Read Only)</label>
          <input
            type="email"
            value={email}
            disabled
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
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