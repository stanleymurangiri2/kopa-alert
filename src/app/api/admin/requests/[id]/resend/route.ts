import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTemporaryPassword } from "@/lib/utils/generate-password";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants/support";
import { getPlatformSetting } from "@/lib/supabase/platform-settings";

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

    const MAX_RESENDS = await getPlatformSetting(supabase, "resend_limit", 3);

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
     * Find the registered business by email, not business_name:
     * business_name has no uniqueness constraint anywhere in the
     * schema, so two businesses sharing a name could resolve to the
     * wrong one. email is UNIQUE NOT NULL on both business_requests
     * and businesses, and approve_business_request() copies the
     * (trimmed) request email straight into the created business row,
     * so this is a real, reliable join key between the two.
     */
    const { data: businessRow, error: businessError } =
      await supabase
        .from("businesses")
        .select("id, business_code, email")
        .eq("email", requestData.email.trim())
        .maybeSingle();

    if (businessError) {
      console.error("Business lookup failed:", businessError);

      return NextResponse.json(
        { error: "Failed to find the registered business." },
        { status: 500 },
      );
    }

    if (!businessRow) {
      return NextResponse.json(
        {
          error:
            "No registered business found for this request. It may have been deleted; this invitation cannot be resent.",
        },
        { status: 404 },
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
            "Linked user account not found for this business.",
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

      const emailResult = await sendEmail({
        to: requestData.email,
        subject:
          "Your KopaAlert Business Account is Approved!",
        html: approvalEmail({
          owner_name: requestData.owner_name,
          business_name: requestData.business_name,
          business_code: businessRow?.business_code ?? "",
          temporary_password: newPassword,
          login_url: "https://www.kopaalert.shop/login",
          support_email: SUPPORT_EMAIL,
          support_phone: SUPPORT_PHONE,
        }),
      });

      // sendEmail() never throws - it returns { success: false } on failure -
      // so a real failure must be turned into a thrown error here, otherwise
      // the catch block below (and its "don't increment resend_count" logic)
      // never runs.
      if (!emailResult.success) {
        throw new Error(emailResult.error ?? "Unknown send failure");
      }
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

