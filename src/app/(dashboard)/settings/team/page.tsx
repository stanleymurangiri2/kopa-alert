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

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'employee',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Get current user's business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setLoading(false);
      return;
    }

    // Load all members in the same business
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be logged in.');
      setInviting(false);
      return;
    }

    const temporaryPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

    const response = await fetch('/api/team/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requesterId: user.id,
        name: form.name,
        email: form.email,
        role: form.role,
        temporaryPassword,
      }),
    });

    const result = await response.json();

    setInviting(false);

    if (!response.ok) {
      alert(result.message || 'Unable to invite member.');
      return;
    }

    alert('Invitation sent successfully.');

    setForm({
      name: '',
      email: '',
      role: 'employee',
    });

    loadMembers();
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading team...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">

      <div>
        <h1 className="text-3xl font-bold">
          Team Management
        </h1>

        <p className="text-gray-500">
          Invite employees and manage your business team.
        </p>
      </div>

      {/* Invite Form */}

      <div className="rounded-lg border bg-white p-6">

        <h2 className="mb-4 text-xl font-semibold">
          Invite Team Member
        </h2>

        <div className="grid gap-4 md:grid-cols-3">

          <input
            className="rounded border p-3"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <input
            className="rounded border p-3"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
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

      {/* Team Members */}

      <div className="overflow-hidden rounded-lg border bg-white">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">
                Name
              </th>

              <th className="px-4 py-3 text-left">
                Email
              </th>

              <th className="px-4 py-3 text-left">
                Role
              </th>

              <th className="px-4 py-3 text-left">
                Joined
              </th>

            </tr>

          </thead>

          <tbody>

            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-gray-500"
                >
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="border-t"
                >
                  <td className="px-4 py-3">
                    {member.name}
                  </td>

                  <td className="px-4 py-3">
                    {member.email}
                  </td>

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

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}