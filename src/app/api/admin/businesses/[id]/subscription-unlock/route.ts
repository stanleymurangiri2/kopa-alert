import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessionClient = await createClient();

    const {
      data: { user: adminUser },
      error: adminAuthError,
    } = await sessionClient.auth.getUser();

    if (adminAuthError || !adminUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (adminProfileError || adminProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { data: existingBusiness, error: existingBusinessError } = await supabase
      .from("businesses")
      .select("id, business_name, subscription_status")
      .eq("id", id)
      .single();

    if (existingBusinessError || !existingBusiness) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    if (existingBusiness.subscription_status !== "locked") {
      return NextResponse.json(
        { error: "Business is not locked." },
        { status: 400 }
      );
    }

    const { data: business, error: updateError } = await supabase
      .from("businesses")
      .update({
        subscription_status: "active",
        subscription_locked_at: null,
      })
      .eq("id", id)
      .select("id, business_name, subscription_status")
      .single();

    if (updateError || !business) {
      console.error("Subscription unlock failed:", updateError);
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to unlock business." },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      business_id: id,
      user_id: adminUser.id,
      action: "MANUAL_UNLOCK_SUBSCRIPTION",
      target_type: "business",
      description: `${business.business_name} unlocked manually without a recorded payment`,
      details: { previous_status: "locked", new_status: "active" },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({ success: true, business });
  } catch (error) {
    console.error("Subscription unlock error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
