import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateTemporaryPassword } from "@/lib/utils/generate-password";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REQUEST_ID = "755a4f95-bb9b-476d-8d2e-97149c296aeb";
const BUSINESS_CODE = "KA-000026";

export async function POST() {
  try {
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
        { status: 403 }
      );
    }

    const { data: registration, error: requestError } =
      await supabase
        .from("business_requests")
        .select("*")
        .eq("id", REQUEST_ID)
        .single();

    if (requestError || !registration) {
      return NextResponse.json(
        { error: "Business request not found." },
        { status: 404 }
      );
    }

    if (registration.status !== "approved") {
      return NextResponse.json(
        { error: "The request is not approved." },
        { status: 400 }
      );
    }

    const { data: existingBusiness } = await supabase
      .from("businesses")
      .select("id, business_code, email")
      .or(
        `business_code.eq.${BUSINESS_CODE},email.eq.${registration.email}`
      )
      .maybeSingle();

    if (existingBusiness) {
      return NextResponse.json(
        {
          error: "Business already exists.",
          business: existingBusiness,
        },
        { status: 409 }
      );
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, business_id")
      .eq("email", registration.email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          error: "User already exists.",
          user: existingUser,
        },
        { status: 409 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const activationToken = randomUUID();

    const { data: authResult, error: authError } =
      await supabase.auth.admin.createUser({
        email: registration.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: registration.owner_name,
        },
      });

    if (authError || !authResult.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ??
            "Failed to create authentication account.",
        },
        { status: 500 }
      );
    }

    const authUserId = authResult.user.id;

    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .insert({
          business_code: BUSINESS_CODE,
          business_name: registration.business_name,
          phone: registration.phone,
          email: registration.email,
          status: "approved",
          activation_token: activationToken,
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: new Date(
            Date.now() + 72 * 60 * 60 * 1000
          ).toISOString(),
        })
        .select("*")
        .single();

    if (businessError || !business) {
      await supabase.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        {
          error:
            businessError?.message ??
            "Failed to restore business.",
        },
        { status: 500 }
      );
    }

    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: authUserId,
        business_id: business.id,
        role: "business_admin",
        name: registration.owner_name,
        email: registration.email,
        must_change_password: true,
      });

    if (userError) {
      await supabase
        .from("businesses")
        .delete()
        .eq("id", business.id);

      await supabase.auth.admin.deleteUser(authUserId);

      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    let emailSent = false;

    try {
      const { sendEmail } = await import(
        "@/lib/notifications/resend"
      );

      const { approvalEmail } = await import(
        "@/lib/notifications/email-templates"
      );

      await sendEmail({
        to: registration.email,
        subject:
          "Your KopaAlert Business Account is Approved!",
        html: approvalEmail({
          owner_name: registration.owner_name,
          business_name: registration.business_name,
          business_code: BUSINESS_CODE,
          temporary_password: temporaryPassword,
          login_url:
            "https://kopa-alert.vercel.app/login",
          support_email:
            "solutiontechcampany@gmail.com",
          support_phone: "+254740305253",
        }),
      });

      emailSent = true;
    } catch (emailError) {
      console.error(
        "Restoration email failed:",
        emailError
      );
    }

    await supabase.from("audit_logs").insert({
      business_id: business.id,
      user_id: adminUser.id,
      action: "RESTORE_BUSINESS",
      target_type: "business",
      description:
        'Restored deleted business "Meriny Investment ltd"',
      details: {
        request_id: REQUEST_ID,
        business_code: BUSINESS_CODE,
        email: registration.email,
        auth_user_id: authUserId,
        email_sent: emailSent,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Meriny Investment ltd restored successfully.",
      business_code: BUSINESS_CODE,
      business_id: business.id,
      email: registration.email,
      emailSent,
      temporaryPassword,
    });
  } catch (error) {
    console.error(
      "Restore Meriny error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
