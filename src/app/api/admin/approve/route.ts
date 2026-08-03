import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sendBusinessInvitation } from "@/lib/notifications/send-business-invitation";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { requestId, password } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        {
          error: "Missing requestId.",
        },
        {
          status: 400,
        },
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error: "Temporary password is required.",
        },
        {
          status: 400,
        },
      );
    }

    //--------------------------------------------------------
    // Load registration request
    //--------------------------------------------------------

    const { data: registration, error: requestError } = await supabase
      .from("business_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !registration) {
      return NextResponse.json(
        {
          error: "Registration request not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (registration.status !== "pending") {
      return NextResponse.json(
        {
          error: "This request has already been processed.",
        },
        {
          status: 400,
        },
      );
    }

    //--------------------------------------------------------
    // Create Auth User
    //--------------------------------------------------------

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
        {
          error: authError?.message ?? "Failed to create authentication user.",
        },
        {
          status: 500,
        },
      
      );
    }

    //--------------------------------------------------------
    // Generate activation token
    //--------------------------------------------------------

    const activationToken = randomUUID();

    //--------------------------------------------------------
    // Approve business
    //--------------------------------------------------------

    const { data, error } = await supabase.rpc("approve_business_request", {
      p_request_id: requestId,
      p_auth_user_id: authUser.user.id,
      p_activation_token: activationToken,
    });

    if (error) {
      await supabase.auth.admin.deleteUser(authUser.user.id);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const approvedBusiness = data?.[0];

    if (!approvedBusiness) {
      return NextResponse.json(
        {
          error: "Business approval completed but no business data returned.",
        },
        {
          status: 500,
        },
      );
    }
//--------------------------------------------------------
    // Send approval email
    //--------------------------------------------------------

    const { sendEmail } = await import("@/lib/notifications/resend");
    const { approvalEmail } = await import("@/lib/notifications/email-templates");

    await sendEmail({
      to: registration.email,
      subject: "Your KopaAlert Business Account is Approved!",
      html: approvalEmail({
        owner_name: registration.owner_name,
        business_name: registration.business_name,
        business_code: approvedBusiness.business_code,
        login_url: "https://kopa-alert.vercel.app/login",
        support_email: "solutiontechcampany@gmail.com",
        support_phone: "+254740305253",
      }),
    });

    //--------------------------------------------------------
    // Audit Log
    //--------------------------------------------------------

    await supabase.from("audit_logs").insert({
      admin_id: null,
      action: "APPROVE_BUSINESS",
      target_type: "business_request",
      target_id: requestId,
      description: `Approved ${registration.business_name}`,
    });

    return NextResponse.json({
      success: true,
      message: "Business approved successfully.",
      activationToken,
      business: approvedBusiness,
    });
  } catch (error) {
    console.error("Approve business error:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      },
    );
  }
}