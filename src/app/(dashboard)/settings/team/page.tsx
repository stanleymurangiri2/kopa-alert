'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'business_admin' | 'employee';
  created_at: string;
}

export default function TeamPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'employee',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }

  async function loadMembers() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: true });

    setMembers(data ?? []);
    setLoading(false);
  }

  async function inviteMember() {
    if (!form.name || !form.email) {
      alert('Please complete all required fields.');
      return;
    }

    setInviting(true);

    const token = await getToken();

    const response = await fetch('/api/team/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        role: form.role,
      }),
    });

    const result = await response.json();

    setInviting(false);

    if (!response.ok) {
      alert(result.message || 'Unable to invite member.');
      return;
    }

    alert('Invitation sent successfully.');

    setForm({ name: '', email: '', role: 'employee' });

    loadMembers();
  }

  async function changeRole(memberId: string, newRole: 'business_admin' | 'employee') {
    setBusyMemberId(memberId);

    const token = await getToken();

    const response = await fetch('/api/team/update-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: memberId,
        role: newRole,
      }),
    });

    const result = await response.json();

    setBusyMemberId(null);

    if (!response.ok || !result.success) {
      alert(result.message || 'Unable to update role.');
      return;
    }

    loadMembers();
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member? This cannot be undone.')) {
      return;
    }

    setBusyMemberId(memberId);

    const token = await getToken();

    const response = await fetch('/api/team/remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: memberId,
      }),
    });

    const result = await response.json();

    setBusyMemberId(null);

    if (!response.ok || !result.success) {
      alert(result.message || 'Unable to remove member.');
      return;
    }

    loadMembers();
  }

  if (loading) {
    return <div className="p-6">Loading team...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-gray-500">
          Invite employees and manage your business team.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">Invite Team Member</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="rounded border p-3"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="rounded border p-3"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <select
            className="rounded border p-3"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value as 'business_admin' | 'employee',
              })
            }
          >
            <option value="employee">Employee</option>
            <option value="business_admin">Business Admin</option>
          </select>
        </div>

        <button
          onClick={inviteMember}
          disabled={inviting}
          className="mt-6 rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {inviting ? 'Inviting...' : 'Invite Member'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="px-4 py-3">{member.name}</td>
                  <td className="px-4 py-3">{member.email}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.role === 'business_admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-center space-x-3">
                    {member.id !== currentUserId && (
                      <>
                        <button
                          disabled={busyMemberId === member.id}
                          onClick={() =>
                            changeRole(
                              member.id,
                              member.role === 'business_admin'
                                ? 'employee'
                                : 'business_admin'
                            )
                          }
                          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Make{' '}
                          {member.role === 'business_admin'
                            ? 'Employee'
                            : 'Admin'}
                        </button>

                        <button
                          disabled={busyMemberId === member.id}
                          onClick={() => removeMember(member.id)}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
