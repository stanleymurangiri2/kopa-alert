import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, SidebarProvider, SidebarToggle } from "@/components/Sidebar";
import { sidebarMenus } from "@/sidebar-config"
import { headers } from "next/headers";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? headersList.get("next-url")?? "";

  if (pathname.includes("/admin/login")) {
    return <>{children}</>;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role,name,email")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  if (profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950">
        <Sidebar
          title="KopaAlert"
          subtitle={profile.name ?? "Super Admin"}
          menu={sidebarMenus.super_admin}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <SidebarToggle />
              <span className="font-bold text-gray-800 lg:hidden dark:text-slate-100">KopaAlert</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
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
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
