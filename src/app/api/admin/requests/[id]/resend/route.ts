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
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { data: adminProfile, error: adminProfileError } =
      await supabase
        .from("users")
        .select("role")
        .eq("id", adminUser.id)
        .single();

    if (
      adminProfileError ||
      adminProfile?.role !== "super_admin"
    ) {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 },
      );
    }

    const { id } = await params;

    const { data: requestData, error: requestError } =
      await supabase
        .from("business_requests")
        .select(
          "id, business_name, owner_name, email, status, resend_count"
        )
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
        {
          error:
            "Only approved requests can have their invitation resent.",
        },
        { status: 400 },
      );
    }

    const currentCount = requestData.resend_count ?? 0;

    if (currentCount >= MAX_RESENDS) {
      return NextResponse.json(
        {
          error: `Resend limit reached (${MAX_RESENDS}/${MAX_RESENDS}).`,
        },
        { status: 400 },
      );
    }

    /*
     * Find the registered business first.
     * This gives us the business_id and avoids relying only
     * on the email address.
     */
    const { data: businessRow, error: businessError } =
      await supabase
        .from("businesses")
        .select("id, business_code, email")
        .eq("business_name", requestData.business_name)
        .maybeSingle();

    if (businessError) {
      console.error("Business lookup failed:", businessError);

      return NextResponse.json(
        { error: "Failed to find the registered business." },
        { status: 500 },
      );
    }

    let userRow = null;

    /*
     * Preferred lookup:
     * Find the user through the business relationship.
     */
    if (businessRow?.id) {
      const { data: businessUser, error: businessUserError } =
        await supabase
          .from("users")
          .select("id, name, email, business_id")
          .eq("business_id", businessRow.id)
          .limit(1)
          .maybeSingle();

      if (businessUserError) {
        console.error(
          "Business user lookup failed:",
          businessUserError
        );
      } else if (businessUser) {
        userRow = businessUser;
      }
    }

    /*
     * Fallback:
     * Find the user using the request email.
     */
    if (!userRow) {
      const { data: emailUser, error: emailUserError } =
        await supabase
          .from("users")
          .select("id, name, email, business_id")
          .eq("email", requestData.email)
          .maybeSingle();

      if (emailUserError) {
        console.error(
          "Email user lookup failed:",
          emailUserError
        );
      } else if (emailUser) {
        userRow = emailUser;
      }
    }

    if (!userRow) {
      return NextResponse.json(
        {
          error:
            "Linked user account not found. The business exists, but no user account is linked to it.",
        },
        { status: 404 },
      );
    }

    const newPassword = generateTemporaryPassword();

    const { error: updatePasswordError } =
      await supabase.auth.admin.updateUserById(userRow.id, {
        password: newPassword,
      });

    if (updatePasswordError) {
      console.error(
        "Password update failed:",
        updatePasswordError
      );

      return NextResponse.json(
        { error: updatePasswordError.message },
        { status: 500 },
      );
    }

    const { error: updateUserError } = await supabase
      .from("users")
      .update({
        must_change_password: true,
      })
      .eq("id", userRow.id);

    if (updateUserError) {
      console.error(
        "Failed to update password-change flag:",
        updateUserError
      );

      return NextResponse.json(
        { error: "Failed to update user account." },
        { status: 500 },
      );
    }

    try {
      const { sendEmail } = await import(
        "@/lib/notifications/resend"
      );

      const { approvalEmail } = await import(
        "@/lib/notifications/email-templates"
      );

      await sendEmail({
        to: requestData.email,
        subject:
          "Your KopaAlert Business Account is Approved!",
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
    } catch (emailError) {
      console.error(
        "Resend approval email failed:",
        emailError
      );

      /*
       * Do not increment resend_count when the email failed.
       * The admin can try again.
       */
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 },
      );
    }

    const newCount = currentCount + 1;

    const { error: countError } = await supabase
      .from("business_requests")
      .update({
        resend_count: newCount,
      })
      .eq("id", id);

    if (countError) {
      console.error(
        "Failed to update resend count:",
        countError
      );

      return NextResponse.json(
        {
          error:
            "Invitation was sent, but the resend count could not be updated.",
        },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        business_id: businessRow?.id ?? null,
        user_id: adminUser.id,
        action: "RESEND_APPROVAL_INVITATION",
        target_type: "business_request",
        description: `Resent approval invitation to ${requestData.business_name} (attempt ${newCount}/${MAX_RESENDS})`,
        details: {
          request_id: id,
          business_id: businessRow?.id ?? null,
          resend_count: newCount,
          email: requestData.email,
        },
      });

    if (auditError) {
      console.error(
        "Audit log insert failed:",
        auditError
      );
    }

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
