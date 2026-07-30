import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason =
      body?.reason ?? "Registration did not meet our requirements.";

    // Check request exists
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

    // Reject the request
    const { error: updateError } = await supabase
      .from("business_requests")
      .update({
        status: "rejected",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { sendEmailJS } = await import("@/lib/notifications/emailjs");

    await sendEmailJS({
      templateId: "rejection",
      params: {
        owner_name: requestData.owner_name,
        business_name: requestData.business_name,
        reason,
        support_email: "solutiontechcampany@gmail.com",
        support_phone: "+254740305253",
        to_email: requestData.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Business request rejected successfully.",
    });
  } catch (error) {
    console.error(error);

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
