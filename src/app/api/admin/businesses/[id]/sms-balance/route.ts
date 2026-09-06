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
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (adminProfileError || adminProfile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0) {
      return NextResponse.json(
        { error: "Amount must be a non-zero whole number." },
        { status: 400 }
      );
    }

    const { data: existingBusiness, error: existingBusinessError } =
      await supabase
        .from("businesses")
        .select("id, business_name, sms_balance")
        .eq("id", id)
        .single();

    if (existingBusinessError || !existingBusiness) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404 }
      );
    }

    const previousBalance = existingBusiness.sms_balance ?? 0;
    const newBalance = Math.max(previousBalance + amount, 0);

    const { data: business, error: updateError } = await supabase
      .from("businesses")
      .update({ sms_balance: newBalance })
      .eq("id", id)
      .select("id, business_name, sms_balance")
      .single();

    if (updateError || !business) {
      console.error("SMS balance update failed:", updateError);

      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update SMS balance." },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        business_id: id,
        user_id: adminUser.id,
        action: "ADJUST_SMS_BALANCE",
        target_type: "business",
        description: `${business.business_name} SMS balance changed from ${previousBalance} to ${business.sms_balance} (${amount > 0 ? "+" : ""}${amount})`,
        details: {
          previous_balance: previousBalance,
          new_balance: business.sms_balance,
          adjustment: amount,
        },
      });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        business_name: business.business_name,
        sms_balance: business.sms_balance,
      },
    });
  } catch (error) {
    console.error("SMS balance update error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
