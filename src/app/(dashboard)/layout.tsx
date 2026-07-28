import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import { SidebarProvider } from '@/components/layout/sidebar-context';

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

  const businessName = profile?.businesses?.business_name || 'System Admin';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100">
        <DashboardSidebar businessName={businessName} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <MobileMenuButton />
              <div>
                <h2 className="text-lg font-bold text-gray-800">KopaAlert</h2>
                <p className="text-xs text-gray-500">{businessName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm font-medium text-gray-700 sm:inline">
                {profile?.name}
              </span>
              <form action="/api/signout" method="post">
                <button
                  type="submit"
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <main className="w-full flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
