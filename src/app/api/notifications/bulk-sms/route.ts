import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBulkSMS } from "@/lib/sms/africastalking";
import { decrementSmsBalance } from "@/lib/supabase/notifications";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        { success: false, message: "Business profile not found." },
        { status: 404 }
      );
    }

    if (profile.role !== "business_admin" && profile.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const customerIds: string[] = Array.isArray(body?.customerIds) ? body.customerIds : [];
    const message: string = typeof body?.message === "string" ? body.message.trim() : "";

    if (customerIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one customer." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Message cannot be empty." },
        { status: 400 }
      );
    }

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("sms_balance")
      .eq("id", profile.business_id)
      .single();

    const balance = business?.sms_balance ?? 0;

    if (balance < customerIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient SMS balance. You have ${balance} credit${balance === 1 ? "" : "s"}, but selected ${customerIds.length} recipient${customerIds.length === 1 ? "" : "s"}.`,
        },
        { status: 400 }
      );
    }

    const { data: customers, error: customersError } = await supabaseAdmin
      .from("customers")
      .select("id, phone")
      .eq("business_id", profile.business_id)
      .in("id", customerIds);

    if (customersError) {
      return NextResponse.json(
        { success: false, message: customersError.message },
        { status: 500 }
      );
    }

    const phones = (customers ?? []).map((c) => c.phone).filter(Boolean);

    if (phones.length === 0) {
      return NextResponse.json(
        { success: false, message: "None of the selected customers have a valid phone number." },
        { status: 400 }
      );
    }

    const result = await sendBulkSMS(phones, message);

    const sentCount = result.sentCount ?? 0;
    const failedCount = result.failedCount ?? phones.length;

    for (let i = 0; i < sentCount; i++) {
      await decrementSmsBalance(profile.business_id).catch(() => {});
    }

    await supabaseAdmin.from("audit_logs").insert({
      business_id: profile.business_id,
      user_id: user.id,
      action: "SEND_BULK_SMS",
      target_type: "customers",
      description: `Sent bulk SMS to ${sentCount} of ${phones.length} selected customer(s)`,
      details: {
        recipient_count: phones.length,
        sent_count: sentCount,
        failed_count: failedCount,
        message_preview: message.slice(0, 200),
      },
    });

    if (!result.success && sentCount === 0) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to send bulk SMS." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: phones.length,
    });
  } catch (error) {
    console.error("Bulk SMS error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
