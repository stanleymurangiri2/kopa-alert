import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBusinessCreditConfig,
  getCustomerCreditLimit,
  getCustomerDebtsAndPayments,
  insertAssessment,
} from "@/lib/supabase/credit";
import { extractCreditFeatures } from "./features";
import { scoreCredit } from "./scoring";
import type { CreditAssessment } from "./types";

const MODEL_VERSION = "rules-v1";

/**
 * Orchestrates one customer's credit assessment: fetch -> extract features ->
 * score -> persist. The only I/O in the credit engine - features.ts and
 * scoring.ts are pure. Never throws: any failure is caught, persisted as a
 * FAILED assessment (or returned in-memory if even that write fails), and
 * returned normally so callers never crash rendering a page over this.
 */
export async function assessCustomerCredit(
  admin: SupabaseClient,
  businessId: string,
  customerId: string,
  actorUserId: string | null
): Promise<CreditAssessment> {
  try {
    const { data: customer, error: customerError } = await getCustomerCreditLimit(admin, customerId);

    if (customerError || !customer || customer.businessId !== businessId) {
      throw new Error("Customer not found for this business.");
    }

    const { data: config, error: configError } = await getBusinessCreditConfig(admin, businessId);

    if (configError || !config) {
      throw new Error("Business credit configuration not found.");
    }

    const currentCreditLimit = customer.creditLimit ?? config.defaultCreditLimit;

    const { debts, payments, error: dataError } = await getCustomerDebtsAndPayments(
      admin,
      businessId,
      customerId
    );

    if (dataError) {
      throw new Error("Failed to load customer debt/payment history.");
    }

    const features = extractCreditFeatures(debts, payments, currentCreditLimit);
    const scoring = scoreCredit(features, config);

    const { data: saved, error: insertError } = await insertAssessment(admin, {
      business_id: businessId,
      customer_id: customerId,
      status: scoring.status,
      risk_score: scoring.riskScore,
      risk_category: scoring.riskCategory,
      current_credit_limit: currentCreditLimit,
      recommended_credit_limit: scoring.recommendedCreditLimit,
      outstanding_balance: features.outstandingBalance,
      credit_utilization: features.creditUtilization,
      reasons: scoring.reasons,
      features,
      model_version: MODEL_VERSION,
      error_message: null,
      created_by: actorUserId,
    });

    if (insertError || !saved) {
      throw new Error("Failed to save credit assessment.");
    }

    return saved;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during credit assessment.";
    console.error("Credit assessment failed:", err);

    const { data: failedRow } = await insertAssessment(admin, {
      business_id: businessId,
      customer_id: customerId,
      status: "FAILED",
      risk_score: null,
      risk_category: "INSUFFICIENT_DATA",
      current_credit_limit: 0,
      recommended_credit_limit: 0,
      outstanding_balance: 0,
      credit_utilization: null,
      reasons: ["Credit assessment could not be completed."],
      features: {},
      model_version: MODEL_VERSION,
      error_message: message,
      created_by: actorUserId,
    }).catch(() => ({ data: null, error: null }));

    if (failedRow) {
      return failedRow;
    }

    // Even the fallback write failed - return an in-memory placeholder so the
    // caller still gets a well-formed, never-throwing result.
    return {
      id: "unsaved",
      business_id: businessId,
      customer_id: customerId,
      status: "FAILED",
      risk_score: null,
      risk_category: "INSUFFICIENT_DATA",
      current_credit_limit: 0,
      recommended_credit_limit: 0,
      outstanding_balance: 0,
      credit_utilization: null,
      reasons: ["Credit assessment could not be completed."],
      features: {},
      model_version: MODEL_VERSION,
      error_message: message,
      applied: false,
      applied_at: null,
      applied_by: null,
      created_by: actorUserId,
      created_at: new Date().toISOString(),
    };
  }
}
