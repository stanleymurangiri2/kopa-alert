import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAssessmentById, markAssessmentApplied, updateCustomerCreditLimit } from "@/lib/supabase/credit";

export async function POST(request: NextRequest) {
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

    if (profile.role !== "business_admin" && profile.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    }

    const body = await request.json();
    const assessmentId = String(body?.assessmentId ?? "");

    if (!assessmentId) {
      return NextResponse.json({ success: false, message: "assessmentId is required." }, { status: 400 });
    }

    const { data: assessment, error: assessmentError } = await getAssessmentById(
      supabaseAdmin,
      profile.business_id,
      assessmentId
    );

    if (assessmentError || !assessment) {
      return NextResponse.json({ success: false, message: "Assessment not found." }, { status: 404 });
    }

    if (assessment.applied) {
      return NextResponse.json(
        { success: false, message: "This recommendation has already been applied." },
        { status: 409 }
      );
    }

    if (assessment.status !== "OK") {
      return NextResponse.json(
        { success: false, message: "Only a completed risk-based assessment can be applied." },
        { status: 400 }
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, business_id, full_name, credit_limit")
      .eq("id", assessment.customer_id)
      .single();

    if (customerError || !customer || customer.business_id !== profile.business_id) {
      return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });
    }

    const previousLimit = customer.credit_limit === null ? assessment.current_credit_limit : Number(customer.credit_limit);
    const newLimit = assessment.recommended_credit_limit;

    const { error: updateError } = await updateCustomerCreditLimit(supabaseAdmin, customer.id, newLimit);

    if (updateError) {
      return NextResponse.json({ success: false, message: "Failed to update credit limit." }, { status: 500 });
    }

    const { data: updatedAssessment, error: markError } = await markAssessmentApplied(
      supabaseAdmin,
      assessmentId,
      user.id
    );

    if (markError) {
      console.error("Failed to mark assessment applied:", markError);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      business_id: profile.business_id,
      user_id: user.id,
      action: "APPLY_CREDIT_LIMIT_RECOMMENDATION",
      target_type: "customer",
      description: `Credit limit for ${customer.full_name} changed from KES ${previousLimit} to KES ${newLimit} (risk: ${assessment.risk_category}, score ${assessment.risk_score})`,
      details: {
        customer_id: customer.id,
        assessment_id: assessment.id,
        previous_limit: previousLimit,
        new_limit: newLimit,
        risk_score: assessment.risk_score,
        risk_category: assessment.risk_category,
        model_version: assessment.model_version,
        reasons: assessment.reasons,
      },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json({
      success: true,
      previousLimit,
      newLimit,
      assessment: updatedAssessment ?? assessment,
    });
  } catch (error) {
    console.error("Credit apply error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
