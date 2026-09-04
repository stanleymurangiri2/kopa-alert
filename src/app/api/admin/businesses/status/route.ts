import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["approved", "suspended"] as const;

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Business status must be either approved or suspended.",
        },
        { status: 400 }
      );
    }

    const { data: existingBusiness, error: existingBusinessError } =
      await supabase
        .from("businesses")
        .select("id, business_name, status")
        .eq("id", id)
        .single();

    if (existingBusinessError || !existingBusiness) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404 }
      );
    }

    if (existingBusiness.status === status) {
      return NextResponse.json(
        {
          error: `Business is already ${status}.`,
        },
        { status: 400 }
      );
    }

    const { data: business, error: updateError } = await supabase
      .from("businesses")
      .update({ status })
      .eq("id", id)
      .select("id, business_name, status")
      .single();

    if (updateError || !business) {
      console.error("Business status update failed:", updateError);

      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update business status." },
        { status: 500 }
      );
    }

    const action =
      status === "approved"
        ? "ACTIVATE_BUSINESS"
        : "SUSPEND_BUSINESS";

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        business_id: id,
        user_id: adminUser.id,
        action,
        target_type: "business",
        description: `${business.business_name} status changed from ${existingBusiness.status} to ${status}`,
        details: {
          previous_status: existingBusiness.status,
          new_status: status,
        },
      });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        business_name: business.business_name,
        status: business.status,
      },
    });
  } catch (error) {
    console.error("Business status update error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
