import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
    const body = await request.json().catch(() => ({}));
    const reason =
      body?.reason ?? "Registration did not meet our requirements.";

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

    if (requestData.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("business_requests")
      .update({ status: "rejected" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    try {
      const { sendEmail } = await import("@/lib/notifications/resend");
      const { rejectionEmail } = await import("@/lib/notifications/email-templates");

      await sendEmail({
        to: requestData.email,
        subject: "Update on Your KopaAlert Business Registration",
        html: rejectionEmail({
          owner_name: requestData.owner_name,
          business_name: requestData.business_name,
          reason,
          support_email: "solutiontechcampany@gmail.com",
          support_phone: "+254740305253",
        }),
      });
    } catch (emailErr) {
      console.error("Rejection email failed:", emailErr);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      business_id: null,
      user_id: adminUser.id,
      action: "REJECT_BUSINESS",
      target_type: "business_request",
      description: `Rejected ${requestData.business_name}`,
      details: { request_id: id, reason },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Business request rejected successfully.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
