
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface CustomerReportItem {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  totalDebts: number;
  totalDebtAmount: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueDebts: number;
  created_at: string;
}

export interface CustomerReportSummary {
  totalCustomers: number;
  customersWithDebt: number;
  customersWithOverdueDebt: number;
  debtFreeCustomers: number;
  totalOutstandingBalance: number;
  totalDebtIssued: number;
  totalCollected: number;
}

export interface CustomerReportResult {
  success: boolean;
  summary?: CustomerReportSummary;
  customers?: CustomerReportItem[];
  message?: string;
}

export async function getCustomerReports(
  businessId: string,
  startDate?: string,
  endDate?: string
): Promise<CustomerReportResult> {
  try {
    // -------------------------------------------------------
    // Load customers
    // -------------------------------------------------------

    let customerQuery = supabase
      .from("customers")
      .select(`
        id,
        full_name,
        phone,
        email,
        created_at
      `)
      .eq("business_id", businessId)
      .order("full_name");

    if (startDate) {
      customerQuery = customerQuery.gte(
        "created_at",
        startDate
      );
    }

    if (endDate) {
      customerQuery = customerQuery.lte(
        "created_at",
        endDate
      );
    }

    const {
      data: customers,
      error: customerError,
    } = await customerQuery;

    if (customerError) {
      return {
        success: false,
        message: customerError.message,
      };
    }

    // -------------------------------------------------------
    // Load debts
    // -------------------------------------------------------

    const {
      data: debts,
      error: debtError,
    } = await supabase
      .from("debts")
      .select(`
        customer_id,
        amount,
        amount_paid,
        status
      `)
      .eq("business_id", businessId);

    if (debtError) {
      return {
        success: false,
        message: debtError.message,
      };
    }

    const report: CustomerReportItem[] = [];

    let customersWithDebt = 0;
    let customersWithOverdueDebt = 0;
    let debtFreeCustomers = 0;

    let totalOutstandingBalance = 0;
    let totalDebtIssued = 0;
    let totalCollected = 0;

    for (const customer of customers ?? []) {
      const customerDebts =
        (debts ?? []).filter(
          (debt) =>
            debt.customer_id === customer.id
        );

      const totalDebts =
        customerDebts.length;

      const totalDebtAmount =
        customerDebts.reduce(
          (sum, debt) =>
            sum + Number(debt.amount),
          0
        );

      const totalPaid =
        customerDebts.reduce(
          (sum, debt) =>
            sum + Number(debt.amount_paid),
          0
        );

      const outstandingBalance =
        totalDebtAmount - totalPaid;

      const overdueDebts =
        customerDebts.filter(
          (debt) =>
            debt.status === "overdue"
        ).length;

      if (totalDebts > 0) {
        customersWithDebt++;
      } else {
        debtFreeCustomers++;
      }

      if (overdueDebts > 0) {
        customersWithOverdueDebt++;
      }

      totalOutstandingBalance +=
        outstandingBalance;

      totalDebtIssued +=
        totalDebtAmount;

      totalCollected +=
        totalPaid;

      report.push({
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        email: customer.email,
        totalDebts,
        totalDebtAmount,
        totalPaid,
        outstandingBalance,
        overdueDebts,
        created_at: customer.created_at,
      });
    }

    report.sort(
      (a, b) =>
        b.outstandingBalance -
        a.outstandingBalance
    );

    return {
      success: true,
      customers: report,
      summary: {
        totalCustomers:
          customers?.length ?? 0,
        customersWithDebt,
        customersWithOverdueDebt,
        debtFreeCustomers,
        totalOutstandingBalance,
        totalDebtIssued,
        totalCollected,
      },
    };
  } catch (error) {
    console.error(
      "Customer reports error:",
      error
    );

    return {
      success: false,
      message:
        "Failed to generate customer report.",
    };
  }
}