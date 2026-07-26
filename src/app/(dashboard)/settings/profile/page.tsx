'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error(error);
      setMessage('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!profile) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
        })
        .eq('id', profile.id);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      if (password.trim() !== '') {
        const { error: passwordError } =
          await supabase.auth.updateUser({
            password,
          });

        if (passwordError) {
          setMessage(passwordError.message);
          setSaving(false);
          return;
        }

        setPassword('');
      }

      setMessage('Profile updated successfully.');
    } catch (error) {
      console.error(error);
      setMessage('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          My Profile
        </h1>

        <p className="text-gray-500">
          Manage your account information.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-md border bg-gray-50 p-3 text-sm">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
      >

        <div>
          <label className="block text-sm font-medium">
            Full Name
          </label>

          <input
            type="text"
            value={profile.name}
            onChange={(e) =>
              setProfile({
                ...profile,
                name: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Email Address
          </label>

          <input
            type="email"
            value={profile.email}
            readOnly
            className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Role
          </label>

          <input
            type="text"
            value={profile.role}
            readOnly
            className="mt-1 w-full rounded-md border bg-gray-100 px-3 py-2 capitalize"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            New Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Leave blank to keep current password"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

      </form>
    </div>
  );
}