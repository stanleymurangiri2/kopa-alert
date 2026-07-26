/**
 * ============================================================================
 * Kopa Alert
 * Reports Overview Service
 * File: src/lib/reports/overview.ts
 * ============================================================================
 */

import { createClient } from "@/lib/supabase/server";

export interface OverviewReport {
  totalCustomers: number;
  totalDebts: number;
  totalOutstanding: number;
  totalCollected: number;
  totalSmsSent: number;
}

export interface OverviewResult {
  success: boolean;
  data?: OverviewReport;
  message?: string;
}

export async function getOverviewMetrics(
  businessId: string
): Promise<OverviewResult> {
  try {
    const supabase = await createClient();

    const [
      customersResult,
      debtsResult,
      paymentsResult,
      smsResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("business_id", businessId),

      supabase
        .from("debts")
        .select("amount,balance")
        .eq("business_id", businessId),

      supabase
        .from("payments")
        .select("amount")
        .eq("business_id", businessId),

      supabase
        .from("notifications")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("business_id", businessId)
        .eq("status", "sent"),
    ]);

    if (customersResult.error) {
      throw customersResult.error;
    }

    if (debtsResult.error) {
      throw debtsResult.error;
    }

    if (paymentsResult.error) {
      throw paymentsResult.error;
    }

    if (smsResult.error) {
      throw smsResult.error;
    }

    const totalOutstanding =
      debtsResult.data?.reduce(
        (sum, debt) => sum + Number(debt.balance ?? 0),
        0
      ) ?? 0;

    const totalDebts =
      debtsResult.data?.reduce(
        (sum, debt) => sum + Number(debt.amount ?? 0),
        0
      ) ?? 0;

    const totalCollected =
      paymentsResult.data?.reduce(
        (sum, payment) => sum + Number(payment.amount ?? 0),
        0
      ) ?? 0;

    return {
      success: true,
      data: {
        totalCustomers: customersResult.count ?? 0,
        totalDebts,
        totalOutstanding,
        totalCollected,
        totalSmsSent: smsResult.count ?? 0,
      },
    };
  } catch (error) {
    console.error("Overview report error:", error);

    return {
      success: false,
      message: "Failed to load dashboard overview.",
    };
  }
}