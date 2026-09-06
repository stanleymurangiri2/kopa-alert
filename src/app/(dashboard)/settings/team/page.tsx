'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'business_admin' | 'employee';
  created_at: string;
  must_change_password: boolean | null;
}

function RoleBadge({ role }: { role: TeamMember['role'] }) {
  const isAdmin = role === 'business_admin';

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isAdmin ? 'bg-employee/10 text-employee' : 'bg-info/10 text-info'
      }`}
    >
      {isAdmin ? 'Admin' : 'Employee'}
    </span>
  );
}

function StatusBadge({ mustChangePassword }: { mustChangePassword: boolean | null }) {
  if (mustChangePassword) {
    return (
      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
        Invite sent
      </span>
    );
  }

  return (
    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
      Active
    </span>
  );
}

export default function TeamPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<TeamMember | null>(null);
  const [memberPendingRoleChange, setMemberPendingRoleChange] = useState<TeamMember | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

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

    setMembers((data ?? []) as TeamMember[]);
    setLoading(false);
  }

  async function inviteMember() {
    if (!form.name || !form.email) {
      setMessage({ type: 'error', text: 'Please complete all required fields.' });
      return;
    }

    setInviting(true);
    setMessage(null);

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
      setMessage({ type: 'error', text: result.message || 'Unable to invite member.' });
      return;
    }

    setMessage({ type: 'success', text: 'Invitation sent successfully.' });

    setForm({ name: '', email: '', role: 'employee' });

    loadMembers();
  }

  async function confirmRoleChange() {
    if (!memberPendingRoleChange) return;

    const memberId = memberPendingRoleChange.id;
    const newRole = memberPendingRoleChange.role === 'business_admin' ? 'employee' : 'business_admin';

    setBusyMemberId(memberId);
    setMessage(null);

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
    setMemberPendingRoleChange(null);

    if (!response.ok || !result.success) {
      setMessage({ type: 'error', text: result.message || 'Unable to update role.' });
      return;
    }

    setMessage({ type: 'success', text: 'Role updated successfully.' });

    loadMembers();
  }

  async function confirmRemove() {
    if (!memberPendingRemoval) return;

    const memberId = memberPendingRemoval.id;
    setBusyMemberId(memberId);
    setMessage(null);

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
    setMemberPendingRemoval(null);

    if (!response.ok || !result.success) {
      setMessage({ type: 'error', text: result.message || 'Unable to remove member.' });
      return;
    }

    setMessage({ type: 'success', text: 'Team member removed successfully.' });

    loadMembers();
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading team...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">
            Invite employees and manage your business team.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Invite Team Member</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="rounded-md border border-border bg-card p-3 text-foreground outline-none focus:border-primary"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="rounded-md border border-border bg-card p-3 text-foreground outline-none focus:border-primary"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <select
            className="rounded-md border border-border bg-card p-3 text-foreground outline-none focus:border-primary"
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
          className="mt-6 flex items-center gap-2 rounded-md bg-employee px-6 py-3 text-sm font-medium text-employee-foreground hover:bg-employee/90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {inviting ? 'Inviting...' : '+ Invite Employee'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full">
          <thead className="bg-primary">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Joined
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member, i) => (
                <tr
                  key={member.id}
                  className={`border-t border-border transition-colors hover:bg-accent ${
                    i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'
                  }`}
                >
                  <td className="px-4 py-3 text-[15px] font-semibold text-foreground">
                    {member.name}
                    {member.id === currentUserId && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{member.email}</td>

                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge mustChangePassword={member.must_change_password} />
                  </td>

                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">
                    {member.id !== currentUserId && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          disabled={busyMemberId === member.id}
                          onClick={() => setMemberPendingRoleChange(member)}
                          aria-label={`Make ${member.name} ${
                            member.role === 'business_admin' ? 'an Employee' : 'an Admin'
                          }`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-info hover:bg-info/10 disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          disabled={busyMemberId === member.id}
                          onClick={() => setMemberPendingRemoval(member)}
                          aria-label={`Remove ${member.name}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {memberPendingRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              {memberPendingRoleChange.role === 'business_admin'
                ? 'Remove admin access?'
                : 'Grant admin access?'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {memberPendingRoleChange.role === 'business_admin' ? (
                <>
                  <span className="font-medium text-foreground">
                    {memberPendingRoleChange.name}
                  </span>{' '}
                  will become an Employee and lose Business Admin permissions.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {memberPendingRoleChange.name}
                  </span>{' '}
                  will become a Business Admin with full access to this business.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMemberPendingRoleChange(null)}
                disabled={busyMemberId === memberPendingRoleChange.id}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                disabled={busyMemberId === memberPendingRoleChange.id}
                className="rounded-md bg-employee px-4 py-2 text-sm font-medium text-employee-foreground hover:bg-employee/90 disabled:opacity-50"
              >
                {busyMemberId === memberPendingRoleChange.id ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {memberPendingRemoval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Remove team member?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to remove{' '}
              <span className="font-medium text-foreground">{memberPendingRemoval.name}</span>{' '}
              ({memberPendingRemoval.email})? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMemberPendingRemoval(null)}
                disabled={busyMemberId === memberPendingRemoval.id}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={busyMemberId === memberPendingRemoval.id}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {busyMemberId === memberPendingRemoval.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
