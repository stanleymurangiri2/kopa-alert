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
  totalDebtAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  overdueDebts: number;
  totalPayments: number;
  smsSent: number;
  smsFailed: number;
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
        .select("amount,amount_paid,status")
        .eq("business_id", businessId),
      supabase
        .from("payments")
        .select("amount_paid", {
          count: "exact",
        })
        .eq("business_id", businessId),
      supabase
        .from("notification_queue")
        .select("status")
        .eq("business_id", businessId),
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

    const debts = debtsResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const smsRows = smsResult.data ?? [];

    // -------------------------------------------------------
    // Debt metrics
    // -------------------------------------------------------
    const totalDebtAmount = debts.reduce(
      (sum, debt) => sum + Number(debt.amount ?? 0),
      0
    );

    const totalAmountPaidOnDebts = debts.reduce(
      (sum, debt) => sum + Number(debt.amount_paid ?? 0),
      0
    );

    const outstandingBalance = totalDebtAmount - totalAmountPaidOnDebts;

    // "Active" debts = anything not fully paid yet
    const totalDebts = debts.filter(
      (debt) => debt.status !== "fully_paid"
    ).length;

    const overdueDebts = debts.filter(
      (debt) => debt.status === "overdue"
    ).length;

    // -------------------------------------------------------
    // Payment metrics
    // -------------------------------------------------------
    const totalPaidAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.amount_paid ?? 0),
      0
    );

    const totalPayments = paymentsResult.count ?? 0;

    // -------------------------------------------------------
    // SMS metrics
    // -------------------------------------------------------
    const smsSent = smsRows.filter(
      (row) => row.status === "sent"
    ).length;

    const smsFailed = smsRows.filter(
      (row) => row.status === "failed"
    ).length;

    return {
      success: true,
      data: {
        totalCustomers: customersResult.count ?? 0,
        totalDebts,
        totalDebtAmount,
        totalPaidAmount,
        outstandingBalance,
        overdueDebts,
        totalPayments,
        smsSent,
        smsFailed,
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