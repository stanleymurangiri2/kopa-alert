import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*, businesses(*)')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">KopaAlert</h2>
          <p className="text-xs text-gray-500">
            {profile?.businesses?.business_name || 'System Admin'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">{profile?.name}</span>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}