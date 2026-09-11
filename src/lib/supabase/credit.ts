import type { SupabaseClient } from "@supabase/supabase-js";
import type { Debt, Payment } from "@/types/database.types";
import type { BusinessCreditConfig, CreditAssessment } from "@/lib/credit/types";

/**
 * Server-side data access for the credit-limit engine. Callers pass in a
 * SupabaseClient (normally supabaseAdmin, since this is API-route/orchestrator
 * code, not browser-side UI code) - mirrors how other admin-driven services
 * in this app take their client explicitly rather than importing one module-wide.
 */

export async function getBusinessCreditConfig(
  admin: SupabaseClient,
  businessId: string
): Promise<{ data: BusinessCreditConfig | null; error: unknown }> {
  const { data, error } = await admin
    .from("businesses")
    .select("default_credit_limit, max_credit_limit, credit_reduction_pct, freeze_on_severe_overdue")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: {
      defaultCreditLimit: Number(data.default_credit_limit),
      maxCreditLimit: Number(data.max_credit_limit),
      reductionPct: Number(data.credit_reduction_pct),
      freezeOnSevereOverdue: Boolean(data.freeze_on_severe_overdue),
    },
    error: null,
  };
}

export async function updateBusinessCreditConfig(
  admin: SupabaseClient,
  businessId: string,
  config: BusinessCreditConfig
) {
  return admin
    .from("businesses")
    .update({
      default_credit_limit: config.defaultCreditLimit,
      max_credit_limit: config.maxCreditLimit,
      credit_reduction_pct: config.reductionPct,
      freeze_on_severe_overdue: config.freezeOnSevereOverdue,
    })
    .eq("id", businessId)
    .select("default_credit_limit, max_credit_limit, credit_reduction_pct, freeze_on_severe_overdue")
    .single();
}

export async function getCustomerCreditLimit(
  admin: SupabaseClient,
  customerId: string
): Promise<{ data: { creditLimit: number | null; businessId: string; fullName: string } | null; error: unknown }> {
  const { data, error } = await admin
    .from("customers")
    .select("credit_limit, business_id, full_name")
    .eq("id", customerId)
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: {
      creditLimit: data.credit_limit === null ? null : Number(data.credit_limit),
      businessId: data.business_id,
      fullName: data.full_name,
    },
    error: null,
  };
}

export async function updateCustomerCreditLimit(admin: SupabaseClient, customerId: string, newLimit: number) {
  return admin.from("customers").update({ credit_limit: newLimit }).eq("id", customerId).select().single();
}

export async function getCustomerDebtsAndPayments(
  admin: SupabaseClient,
  businessId: string,
  customerId: string
): Promise<{ debts: Debt[]; payments: Payment[]; error: unknown }> {
  const { data: debts, error: debtsError } = await admin
    .from("debts")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId);

  if (debtsError || !debts) {
    return { debts: [], payments: [], error: debtsError };
  }

  const debtIds = debts.map((d) => d.id);
  if (debtIds.length === 0) {
    return { debts: [], payments: [], error: null };
  }

  const { data: payments, error: paymentsError } = await admin
    .from("payments")
    .select("*")
    .in("debt_id", debtIds);

  if (paymentsError) {
    return { debts, payments: [], error: paymentsError };
  }

  return { debts, payments: payments ?? [], error: null };
}

function mapAssessmentRow(row: Record<string, unknown>): CreditAssessment {
  return {
    id: row.id as string,
    business_id: row.business_id as string,
    customer_id: row.customer_id as string,
    status: row.status as CreditAssessment["status"],
    risk_score: row.risk_score === null ? null : Number(row.risk_score),
    risk_category: row.risk_category as CreditAssessment["risk_category"],
    current_credit_limit: Number(row.current_credit_limit),
    recommended_credit_limit: Number(row.recommended_credit_limit),
    outstanding_balance: Number(row.outstanding_balance),
    credit_utilization: row.credit_utilization === null ? null : Number(row.credit_utilization),
    reasons: (row.reasons as string[]) ?? [],
    features: (row.features as CreditAssessment["features"]) ?? {},
    model_version: row.model_version as string,
    error_message: (row.error_message as string | null) ?? null,
    applied: Boolean(row.applied),
    applied_at: (row.applied_at as string | null) ?? null,
    applied_by: (row.applied_by as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function insertAssessment(
  admin: SupabaseClient,
  row: Omit<CreditAssessment, "id" | "created_at" | "applied" | "applied_at" | "applied_by">
): Promise<{ data: CreditAssessment | null; error: unknown }> {
  const { data, error } = await admin
    .from("credit_assessments")
    .insert({
      business_id: row.business_id,
      customer_id: row.customer_id,
      status: row.status,
      risk_score: row.risk_score,
      risk_category: row.risk_category,
      current_credit_limit: row.current_credit_limit,
      recommended_credit_limit: row.recommended_credit_limit,
      outstanding_balance: row.outstanding_balance,
      credit_utilization: row.credit_utilization,
      reasons: row.reasons,
      features: row.features,
      model_version: row.model_version,
      error_message: row.error_message,
      created_by: row.created_by,
    })
    .select()
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return { data: mapAssessmentRow(data), error: null };
}

export async function getLatestAssessment(
  admin: SupabaseClient,
  businessId: string,
  customerId: string
): Promise<{ data: CreditAssessment | null; error: unknown }> {
  const { data, error } = await admin
    .from("credit_assessments")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: data ? mapAssessmentRow(data) : null, error: null };
}

export async function getAssessmentHistory(
  admin: SupabaseClient,
  businessId: string,
  customerId: string,
  limit = 20
): Promise<{ data: CreditAssessment[]; error: unknown }> {
  const { data, error } = await admin
    .from("credit_assessments")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return { data: [], error };
  }

  return { data: data.map(mapAssessmentRow), error: null };
}

export async function getAssessmentById(
  admin: SupabaseClient,
  businessId: string,
  assessmentId: string
): Promise<{ data: CreditAssessment | null; error: unknown }> {
  const { data, error } = await admin
    .from("credit_assessments")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", assessmentId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: data ? mapAssessmentRow(data) : null, error: null };
}

export async function markAssessmentApplied(admin: SupabaseClient, assessmentId: string, appliedBy: string) {
  return admin
    .from("credit_assessments")
    .update({ applied: true, applied_at: new Date().toISOString(), applied_by: appliedBy })
    .eq("id", assessmentId)
    .select()
    .single();
}

/** Most recent debt/payment activity timestamp for a customer, used to decide if a cached assessment is stale. */
export async function getLatestActivityAt(
  admin: SupabaseClient,
  businessId: string,
  customerId: string
): Promise<string | null> {
  const { data: debts } = await admin
    .from("debts")
    .select("updated_at")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: debtIdsRows } = await admin
    .from("debts")
    .select("id")
    .eq("business_id", businessId)
    .eq("customer_id", customerId);

  const debtIds = (debtIdsRows ?? []).map((d) => d.id);

  let latestPaymentAt: string | null = null;
  if (debtIds.length > 0) {
    const { data: payment } = await admin
      .from("payments")
      .select("created_at")
      .in("debt_id", debtIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestPaymentAt = payment?.created_at ?? null;
  }

  const candidates = [debts?.updated_at, latestPaymentAt].filter(Boolean) as string[];
  if (candidates.length === 0) return null;

  return candidates.reduce((latest, current) => (new Date(current) > new Date(latest) ? current : latest));
}
