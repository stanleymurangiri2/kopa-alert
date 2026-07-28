import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./components/Sidebar";
import MobileMenuButton from "@/components/layout/MobileMenuButton";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  //----------------------------------------------------
  // Check authentication
  //----------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  //----------------------------------------------------
  // Verify Super Admin
  //----------------------------------------------------

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

  //----------------------------------------------------
  // Render protected pages
  //----------------------------------------------------

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
            <MobileMenuButton />
            <span className="font-bold text-gray-800">KopaAlert</span>
          </header>

          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}