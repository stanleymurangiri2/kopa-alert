import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assessCustomerCredit } from "@/lib/credit/assess";
import { getLatestActivityAt, getLatestAssessment } from "@/lib/supabase/credit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json({ success: false, message: "Profile not found." }, { status: 404 });
    }

    if (
      profile.role !== "business_admin" &&
      profile.role !== "employee" &&
      profile.role !== "super_admin"
    ) {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const customerId = request.nextUrl.searchParams.get("customerId") ?? "";

    if (!customerId) {
      return NextResponse.json({ success: false, message: "customerId is required." }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, business_id")
      .eq("id", customerId)
      .single();

    if (customerError || !customer || customer.business_id !== profile.business_id) {
      return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });
    }

    const { data: existing } = await getLatestAssessment(supabaseAdmin, profile.business_id, customerId);
    const latestActivityAt = await getLatestActivityAt(supabaseAdmin, profile.business_id, customerId);

    const isStale =
      !existing ||
      existing.status === "FAILED" ||
      existing.applied || // applying changes customers.credit_limit, invalidating this assessment's snapshot of it
      (latestActivityAt && new Date(latestActivityAt) > new Date(existing.created_at));

    const assessment = isStale
      ? await assessCustomerCredit(supabaseAdmin, profile.business_id, customerId, null)
      : existing;

    return NextResponse.json({ success: true, assessment });
  } catch (error) {
    console.error("Credit latest error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
