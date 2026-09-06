'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';
import { Loader2 } from 'lucide-react';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string | null;
  businesses: { business_name: string } | { business_name: string }[] | null;
};

function businessName(profile: UserProfile) {
  const rel = profile.businesses;
  const b = Array.isArray(rel) ? rel[0] : rel;
  return b?.business_name ?? null;
}

export default function ProfilePage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

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
        .select('id, name, email, role, created_at, businesses(business_name)')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data as unknown as UserProfile);
      }
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!profile) return;

    if (password.trim() !== '') {
      if (password.length < 8) {
        showToast('error', 'New password must be at least 8 characters.');
        return;
      }

      if (password !== confirmPassword) {
        showToast('error', 'New password and confirmation do not match.');
        return;
      }
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
        })
        .eq('id', profile.id);

      if (error) {
        showToast('error', error.message);
        setSaving(false);
        return;
      }

      if (password.trim() !== '') {
        const { error: passwordError } =
          await supabase.auth.updateUser({
            password,
          });

        if (passwordError) {
          showToast('error', passwordError.message);
          setSaving(false);
          return;
        }

        setPassword('');
        setConfirmPassword('');
      }

      showToast('success', 'Profile updated successfully.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-muted-foreground">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          My Profile
        </h1>

        <p className="text-muted-foreground">
          Manage your account information.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm"
      >

        <div>
          <label className="block text-sm font-medium text-foreground">
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
            className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Email Address
          </label>

          <input
            type="email"
            value={profile.email}
            readOnly
            className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Role
            </label>

            <input
              type="text"
              value={profile.role.replace('_', ' ')}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2 capitalize"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Business
            </label>

            <input
              type="text"
              value={businessName(profile) ?? '—'}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2"
            />
          </div>
        </div>

        {profile.created_at && (
          <div>
            <label className="block text-sm font-medium text-foreground">
              Member Since
            </label>

            <input
              type="text"
              value={new Date(profile.created_at).toLocaleDateString()}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2"
            />
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              New Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Leave blank to keep current password"
              className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Confirm New Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

      </form>
    </div>
  );
}
