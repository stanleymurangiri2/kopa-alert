import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateTemporaryPassword } from "@/lib/utils/generate-password";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------------
    // Authenticate and authorize the caller
    // --------------------------------------------------------

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

    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing requestId." },
        { status: 400 }
      );
    }

    const password = generateTemporaryPassword();

    const { data: registration, error: requestError } = await supabase
      .from("business_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !registration) {
      return NextResponse.json(
        { error: "Registration request not found." },
        { status: 404 }
      );
    }

    if (registration.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 400 }
      );
    }

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: registration.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: registration.owner_name,
        },
      });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create authentication user." },
        { status: 500 }
      );
    }

    const activationToken = randomUUID();

    const { data, error } = await supabase.rpc("approve_business_request", {
      p_request_id: requestId,
      p_auth_user_id: authUser.user.id,
      p_activation_token: activationToken,
    });

    if (error) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const approvedBusiness = data?.[0];

    if (!approvedBusiness) {
      return NextResponse.json(
        { error: "Business approval completed but no business data returned." },
        { status: 500 }
      );
    }

    await supabase
      .from("users")
      .update({ must_change_password: true })
      .eq("id", authUser.user.id);

    let emailSent = false;
    try {
      const { sendEmail } = await import("@/lib/notifications/resend");
      const { approvalEmail } = await import("@/lib/notifications/email-templates");

      await sendEmail({
        to: registration.email,
        subject: "Your KopaAlert Business Account is Approved!",
        html: approvalEmail({
          owner_name: registration.owner_name,
          business_name: registration.business_name,
          business_code: approvedBusiness.business_code,
          temporary_password: password,
          login_url: "https://kopa-alert.vercel.app/login",
          support_email: "solutiontechcampany@gmail.com",
          support_phone: "+254740305253",
        }),
      });

      emailSent = true;
    } catch (emailErr) {
      console.error("Approval email failed:", emailErr);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      business_id: approvedBusiness.id,
      user_id: adminUser.id,
      action: "APPROVE_BUSINESS",
      target_type: "business_request",
      description: `Approved ${registration.business_name}`,
      details: { request_id: requestId, email_sent: emailSent },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Business approved successfully.",
      activationToken,
      business: approvedBusiness,
    });
  } catch (error) {
    console.error("Approve business error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
