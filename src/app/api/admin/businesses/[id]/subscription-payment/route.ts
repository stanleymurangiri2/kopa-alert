import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants/support";

const ALLOWED_METHODS = ["cash", "mpesa", "bank", "other"] as const;
const BILLING_PERIOD_DAYS = 30;

function generateInvoiceNumber(businessCode: string) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${businessCode}-${datePart}-${randomPart}`;
}

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

    const body = await request.json();
    const amount = Number(body?.amount);
    const paymentMethod = String(body?.payment_method ?? "");
    const reference = body?.reference ? String(body.reference).trim() : null;
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number." },
        { status: 400 }
      );
    }

    if (!ALLOWED_METHODS.includes(paymentMethod as (typeof ALLOWED_METHODS)[number])) {
      return NextResponse.json(
        { error: "Invalid payment method." },
        { status: 400 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select(
        "id, business_code, business_name, email, subscription_tier, subscription_status, subscription_expires_at"
      )
      .eq("id", id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const now = new Date();
    const currentExpiresAt = business.subscription_expires_at
      ? new Date(business.subscription_expires_at)
      : null;

    const baseDate =
      currentExpiresAt && currentExpiresAt > now ? currentExpiresAt : now;

    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + BILLING_PERIOD_DAYS);

    const periodStart = currentExpiresAt ?? now;

    const previousTier = business.subscription_tier;
    const wasLocked = business.subscription_status === "locked";

    const { data: updatedBusiness, error: updateError } = await supabase
      .from("businesses")
      .update({
        subscription_tier: "paid",
        subscription_status: "active",
        subscription_price: amount,
        subscription_expires_at: newExpiresAt.toISOString(),
        subscription_locked_at: null,
        subscription_reminder_sent_at: null,
        subscription_final_notice_sent_at: null,
        subscription_last_payment_at: now.toISOString(),
      })
      .eq("id", id)
      .select("id, business_name, email, subscription_tier, subscription_price, subscription_expires_at")
      .single();

    if (updateError || !updatedBusiness) {
      console.error("Subscription payment update failed:", updateError);
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to record payment." },
        { status: 500 }
      );
    }

    const invoiceNumber = generateInvoiceNumber(business.business_code);

    const { data: paymentRow, error: paymentInsertError } = await supabase
      .from("subscription_payments")
      .insert({
        business_id: id,
        payment_type: "monthly",
        amount,
        payment_method: paymentMethod,
        mpesa_reference: reference,
        sender_phone: null,
        status: "approved",
        admin_notes: notes,
        invoice_number: invoiceNumber,
        period_start: periodStart.toISOString(),
        period_end: newExpiresAt.toISOString(),
        recorded_by: adminUser.id,
      })
      .select("id, invoice_number")
      .single();

    if (paymentInsertError) {
      console.error("Subscription payment insert failed:", paymentInsertError);
    }

    const { data: businessAdmin } = await supabase
      .from("users")
      .select("name")
      .eq("business_id", id)
      .eq("role", "business_admin")
      .limit(1)
      .maybeSingle();

    let emailSent = false;

    if (business.email) {
      try {
        const { sendEmail } = await import("@/lib/notifications/resend");
        const { subscriptionInvoiceReceiptEmail } = await import(
          "@/lib/notifications/email-templates"
        );

        await sendEmail({
          to: business.email,
          subject: `Payment Received - Invoice ${invoiceNumber}`,
          html: subscriptionInvoiceReceiptEmail({
            name: businessAdmin?.name ?? "there",
            business_name: updatedBusiness.business_name,
            invoice_number: invoiceNumber,
            amount,
            currency: "KES",
            payment_method: paymentMethod,
            reference,
            period_start: periodStart.toISOString(),
            period_end: newExpiresAt.toISOString(),
            support_email: SUPPORT_EMAIL,
            support_phone: SUPPORT_PHONE,
          }),
        });

        emailSent = true;
      } catch (emailErr) {
        console.error("Subscription invoice/receipt email failed:", emailErr);
      }
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      business_id: id,
      user_id: adminUser.id,
      action: "RECORD_SUBSCRIPTION_PAYMENT",
      target_type: "business",
      description: `Recorded KES ${amount.toLocaleString()} subscription payment for ${updatedBusiness.business_name} (invoice ${invoiceNumber})`,
      details: {
        amount,
        payment_method: paymentMethod,
        reference,
        previous_tier: previousTier,
        new_tier: "paid",
        previous_expires_at: business.subscription_expires_at,
        new_expires_at: newExpiresAt.toISOString(),
        was_locked: wasLocked,
        invoice_number: invoiceNumber,
        email_sent: emailSent,
      },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({
      success: true,
      emailSent,
      business: updatedBusiness,
      payment: paymentRow,
    });
  } catch (error) {
    console.error("Subscription payment error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
