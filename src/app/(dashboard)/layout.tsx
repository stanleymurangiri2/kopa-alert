import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import IdleTimeout from '@/components/auth/IdleTimeout';
import ThemeToggle from '@/components/layout/ThemeToggle';
import UserAvatar from '@/components/layout/UserAvatar';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';

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
  if (profile?.must_change_password) {
    redirect('/change-password');
  }
  if (
    profile?.role !== 'super_admin' &&
    profile?.businesses?.subscription_tier !== 'free' &&
    profile?.businesses?.subscription_status === 'locked'
  ) {
    redirect('/account-locked');
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
       <DashboardSidebar businessName={businessName} role={profile?.role} />
  <IdleTimeout />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sm:px-6">
            <div className="flex items-center gap-2">
              <MobileMenuButton />
              <div>
                <h2 className="text-lg font-bold text-foreground">KopaAlert</h2>
                <p className="text-xs text-muted-foreground">{businessName}</p>
              </div>
            </div>

            <GlobalSearchBar href="/customers" placeholder="Search customer name, phone, or email..." />

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <UserAvatar name={profile?.name} />
              <span className="hidden text-sm font-medium text-foreground sm:inline">
  {profile?.name} <span className="text-xs text-muted-foreground">({profile?.role?.replace('_', ' ')})</span>
</span>
              <form action="/api/signout" method="post">
                <button
                  type="submit"
                  className="text-xs font-medium text-destructive hover:underline"
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