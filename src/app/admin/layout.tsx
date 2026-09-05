import { ReactNode } from "react";
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
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

            <div className="flex items-center gap-3">
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
