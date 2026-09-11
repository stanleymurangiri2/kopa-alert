import { ReactNode } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Sidebar,
  SidebarProvider,
  SidebarToggle,
} from "@/components/Sidebar";
import { sidebarMenus } from "@/sidebar-config";
import ThemeToggle from "@/components/layout/ThemeToggle";
import UserAvatar from "@/components/layout/UserAvatar";
import GlobalSearchBar from "@/components/layout/GlobalSearchBar";
import IdleTimeout from "@/components/auth/IdleTimeout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role,name,email")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  if (profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const { count: pendingCount } = await supabase
    .from("business_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <IdleTimeout />
        <Sidebar
          title="KopaAlert"
          subtitle={profile.name ?? "Super Admin"}
          menu={sidebarMenus.super_admin}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2">
              <SidebarToggle />

              <span className="font-bold text-foreground lg:hidden">
                KopaAlert
              </span>
            </div>

            <GlobalSearchBar href="/admin/businesses" placeholder="Search business, code, email, or phone..." />

            <div className="flex items-center gap-3">
              <Link
                href="/admin/requests"
                aria-label={`Pending approvals${pendingCount ? ` (${pendingCount})` : ""}`}
                className="relative rounded-lg p-2 text-foreground hover:bg-accent"
              >
                <Bell className="h-5 w-5" />
                {pendingCount !== null && pendingCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>

              <ThemeToggle />

              <UserAvatar name={profile.name} />

              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {profile.name}
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

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
