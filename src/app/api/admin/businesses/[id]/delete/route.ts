import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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
    const body = await request.json().catch(() => ({}));
    const confirmName = body?.confirmName ?? "";

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("business_name")
      .eq("id", id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    if (confirmName.trim() !== business.business_name) {
      return NextResponse.json(
        { error: "Confirmation text does not match the business name." },
        { status: 400 },
      );
    }

    // Capture counts before deletion for the audit record.
    const [
      { count: customers },
      { count: debts },
      { count: payments },
    ] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("debts").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("business_id", id),
    ]);

    const { error: deleteError } = await supabase
      .from("businesses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Logged with business_id: null since the business (and its cascaded
    // activity_logs rows) no longer exist - the business name is kept in
    // the description text so the record remains readable.
    await supabase.from("audit_logs").insert({
      business_id: null,
      user_id: adminUser.id,
      action: "DELETE_BUSINESS",
      target_type: "business",
      description: `Permanently deleted business "${business.business_name}" and all its data`,
      details: {
        business_name: business.business_name,
        deleted_counts: {
          customers: customers ?? 0,
          debts: debts ?? 0,
          payments: payments ?? 0,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete business error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
