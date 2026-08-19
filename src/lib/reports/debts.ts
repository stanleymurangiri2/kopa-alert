
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface DebtReportItem {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  due_date: string;
  description: string;
  created_at: string;
}

export interface DebtReportSummary {
  totalDebts: number;
  totalAmount: number;
  totalPaid: number;
  outstandingBalance: number;
  pendingCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
  fullyPaidCount: number;
}

export interface DebtReportResult {
  success: boolean;
  summary?: DebtReportSummary;
  debts?: DebtReportItem[];
  message?: string;
}


export async function getDebtReports(
  businessId: string,
  startDate?: string,
  endDate?: string
): Promise<DebtReportResult> {

  try {

    // -------------------------------------------------------
    // Fetch debts for this business only
    // -------------------------------------------------------

    let query = supabase
      .from("debts")
      .select(
        `
        id,
        customer_id,
        amount,
        amount_paid,
        status,
        due_date,
        description,
        created_at,
        customers (
          full_name,
          phone
        )
        `
      )
      .eq("business_id", businessId)
      .order("created_at", {
        ascending: false,
      });


    if (startDate) {
      query = query.gte(
        "created_at",
        startDate
      );
    }


    if (endDate) {
      query = query.lte(
        "created_at",
        endDate
      );
    }


    const {
      data: debts,
      error,
    } = await query;


    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }


    // -------------------------------------------------------
    // Transform data
    // -------------------------------------------------------

    const formattedDebts: DebtReportItem[] =
      (debts ?? []).map((debt: any) => ({
        id: debt.id,
        customer_id: debt.customer_id,
        customer_name:
          debt.customers?.full_name ??
          "Unknown",
        phone:
          debt.customers?.phone ??
          "",
        amount: Number(debt.amount),
        amount_paid: Number(
          debt.amount_paid
        ),
        balance:
          Number(debt.amount) -
          Number(debt.amount_paid),
        status: debt.status,
        due_date: debt.due_date,
        description: debt.description,
        created_at: debt.created_at,
      }));


    // -------------------------------------------------------
    // Generate summary
    // -------------------------------------------------------

    const summary: DebtReportSummary = {
      totalDebts: formattedDebts.length,

      totalAmount:
        formattedDebts.reduce(
          (sum, debt) =>
            sum + debt.amount,
          0
        ),

      totalPaid:
        formattedDebts.reduce(
          (sum, debt) =>
            sum + debt.amount_paid,
          0
        ),

      outstandingBalance:
        formattedDebts.reduce(
          (sum, debt) =>
            sum + debt.balance,
          0
        ),

      pendingCount:
        formattedDebts.filter(
          (debt) =>
            debt.status === "pending"
        ).length,


      partiallyPaidCount:
        formattedDebts.filter(
          (debt) =>
            debt.status === "partially_paid"
        ).length,


      overdueCount:
        formattedDebts.filter(
          (debt) =>
            debt.status === "overdue"
        ).length,


      fullyPaidCount:
        formattedDebts.filter(
          (debt) =>
            debt.status === "fully_paid"
        ).length,
    };


    return {
      success: true,
      summary,
      debts: formattedDebts,
    };


  } catch (error) {

    console.error(
      "Debt reports error:",
      error
    );


    return {
      success: false,
      message:
        "Failed to generate debt report.",
    };

  }
}
