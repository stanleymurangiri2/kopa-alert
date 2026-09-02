import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTemporaryPassword } from "@/lib/utils/generate-password";

const MAX_RESENDS = 3;

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

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (adminProfileError || adminProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { id } = await params;

    const { data: requestData, error: requestError } = await supabase
      .from("business_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json(
        { error: "Business request not found." },
        { status: 404 },
      );
    }

    if (requestData.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved requests can have their invitation resent." },
        { status: 400 },
      );
    }

    const currentCount = requestData.resend_count ?? 0;

    if (currentCount >= MAX_RESENDS) {
      return NextResponse.json(
        { error: `Resend limit reached (${MAX_RESENDS}/${MAX_RESENDS}).` },
        { status: 400 },
      );
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id, name")
      .eq("email", requestData.email)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: "Linked user account not found." },
        { status: 404 },
      );
    }

    const { data: businessRow } = await supabase
      .from("businesses")
      .select("business_code")
      .eq("email", requestData.email)
      .single();

    const newPassword = generateTemporaryPassword();

    const { error: updatePasswordError } =
      await supabase.auth.admin.updateUserById(userRow.id, {
        password: newPassword,
      });

    if (updatePasswordError) {
      return NextResponse.json(
        { error: updatePasswordError.message },
        { status: 500 },
      );
    }

    await supabase
      .from("users")
      .update({ must_change_password: true })
      .eq("id", userRow.id);

    try {
      const { sendEmail } = await import("@/lib/notifications/resend");
      const { approvalEmail } = await import(
        "@/lib/notifications/email-templates"
      );

      await sendEmail({
        to: requestData.email,
        subject: "Your KopaAlert Business Account is Approved!",
        html: approvalEmail({
          owner_name: requestData.owner_name,
          business_name: requestData.business_name,
          business_code: businessRow?.business_code ?? "",
          temporary_password: newPassword,
          login_url: "https://kopa-alert.vercel.app/login",
          support_email: "solutiontechcampany@gmail.com",
          support_phone: "+254740305253",
        }),
      });
    } catch (emailErr) {
      console.error("Resend approval email failed:", emailErr);
      return NextResponse.json(
        { error: "Failed to send email." },
        { status: 500 },
      );
    }

    const newCount = currentCount + 1;

    await supabase
      .from("business_requests")
      .update({ resend_count: newCount })
      .eq("id", id);

    await supabase.from("audit_logs").insert({
      business_id: null,
      user_id: adminUser.id,
      action: "RESEND_APPROVAL_INVITATION",
      target_type: "business_request",
      description: `Resent approval invitation to ${requestData.business_name} (attempt ${newCount}/${MAX_RESENDS})`,
      details: { request_id: id, resend_count: newCount },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully.",
      resendCount: newCount,
      remaining: MAX_RESENDS - newCount,
    });
  } catch (error) {
    console.error("Resend invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
