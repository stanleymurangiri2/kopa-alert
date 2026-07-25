import { createClient } from '@/lib/supabase/server';
import { UserProfile } from '@/types/database.types';

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user?.id)
    .single();

  let members: UserProfile[] = [];

  if (currentProfile?.business_id) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('business_id', currentProfile.business_id)
      .order('created_at', { ascending: true });

    members = data || [];
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        <p className="text-sm text-gray-500">Everyone with access to your business account</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        {members.length === 0 && (
          <p className="p-6 text-sm text-gray-500">No team members found.</p>
        )}
        {members.map((member) => (
          <div key={member.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{member.name}</p>
              <p className="text-xs text-gray-500">{member.email}</p>
            </div>
            <span className="text-xs font-semibold uppercase text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              {member.role.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
