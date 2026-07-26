import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./components/Sidebar";

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
  <div className="flex min-h-screen bg-gray-100">

    <Sidebar />

    <main className="flex-1 overflow-auto">
      {children}
    </main>

  </div>
);
}