import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBulkSMS } from "@/lib/sms/africastalking";

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
      .select("business_name")
      .eq("id", profile.business_id)
      .single();

    // Outbound SMS is sent from the owner's own phone number, not a
    // registered alphanumeric sender ID, so lead with the business name
    // (capitalized - plain SMS has no bold) so recipients know who it's from.
    const finalMessage = business?.business_name
      ? `${business.business_name.toUpperCase()}\n${message}`
      : message;

    // Atomically check-and-reserve balance for the full recipient count
    // rather than a plain read-then-compare: that left a window where two
    // concurrent requests for the same business could both pass the check
    // against the same pre-send balance and both actually send.
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .rpc("reserve_sms_balance", {
        p_business_id: profile.business_id,
        p_amount: customerIds.length,
      })
      .single<{ reserved: boolean; new_balance: number }>();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { success: false, message: "Failed to check SMS balance." },
        { status: 500 }
      );
    }

    if (!reservation.reserved) {
      const balance = reservation.new_balance;
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
      // Balance was already reserved for the full count - give it back
      // since nothing was sent.
      await supabaseAdmin.rpc("refund_sms_balance", {
        p_business_id: profile.business_id,
        p_amount: customerIds.length,
      });

      return NextResponse.json(
        { success: false, message: customersError.message },
        { status: 500 }
      );
    }

    const phones = (customers ?? []).map((c) => c.phone).filter(Boolean);

    if (phones.length === 0) {
      await supabaseAdmin.rpc("refund_sms_balance", {
        p_business_id: profile.business_id,
        p_amount: customerIds.length,
      });

      return NextResponse.json(
        { success: false, message: "None of the selected customers have a valid phone number." },
        { status: 400 }
      );
    }

    const result = await sendBulkSMS(phones, finalMessage);

    const sentCount = result.sentCount ?? 0;
    const failedCount = result.failedCount ?? phones.length;

    // customerIds.length was reserved upfront; give back whatever didn't
    // actually go out (missing phone numbers, or the send itself failing).
    const unreserved = customerIds.length - sentCount;
    if (unreserved > 0) {
      await supabaseAdmin.rpc("refund_sms_balance", {
        p_business_id: profile.business_id,
        p_amount: unreserved,
      });
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
        message_preview: finalMessage.slice(0, 200),
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
