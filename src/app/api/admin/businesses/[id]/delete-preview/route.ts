import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionClient = await createClient();

    const {
      data: { user: adminUser },
      error: adminAuthError,
    } = await sessionClient.auth.getUser();

    if (adminAuthError || !adminUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (adminProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { id } = await params;

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("business_name")
      .eq("id", id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const [
      { count: customers },
      { count: debts },
      { count: payments },
      { count: notifications },
      { count: businessUsers },
    ] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("debts").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("notification_queue").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("business_id", id),
    ]);

    return NextResponse.json({
      success: true,
      business_name: business.business_name,
      counts: {
        customers: customers ?? 0,
        debts: debts ?? 0,
        payments: payments ?? 0,
        notifications: notifications ?? 0,
        users: businessUsers ?? 0,
      },
    });
  } catch (error) {
    console.error("Delete preview error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
