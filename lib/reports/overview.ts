import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface OverviewMetrics {
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
  data?: OverviewMetrics;
  message?: string;
}

export async function getOverviewMetrics(
  businessId: string
): Promise<OverviewResult> {
  try {
    // -------------------------------------------------------
    // Validate business
    // -------------------------------------------------------

    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .single();

    if (businessError || !business) {
      return {
        success: false,
        message: "Business not found.",
      };
    }

    // -------------------------------------------------------
    // Customers count
    // -------------------------------------------------------

    const { count: totalCustomers } = await supabase
      .from("customers")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId);


    // -------------------------------------------------------
    // Debt statistics
    // -------------------------------------------------------

    const { data: debts } = await supabase
      .from("debts")
      .select(
        `
        amount,
        amount_paid,
        status
        `
      )
      .eq("business_id", businessId);


    let totalDebtAmount = 0;
    let totalPaidAmount = 0;
    let overdueDebts = 0;


    debts?.forEach((debt) => {
      totalDebtAmount += Number(debt.amount);
      totalPaidAmount += Number(debt.amount_paid);

      if (debt.status === "overdue") {
        overdueDebts++;
      }
    });


    // -------------------------------------------------------
    // Payment count
    // -------------------------------------------------------

    const { count: totalPayments } = await supabase
      .from("payments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId);


    // -------------------------------------------------------
    // SMS statistics
    // -------------------------------------------------------

    const { data: notifications } = await supabase
      .from("notification_queue")
      .select("status")
      .eq("business_id", businessId);


    let smsSent = 0;
    let smsFailed = 0;


    notifications?.forEach((notification) => {
      if (notification.status === "sent") {
        smsSent++;
      }

      if (notification.status === "failed") {
        smsFailed++;
      }
    });


    // -------------------------------------------------------
    // Return dashboard metrics
    // -------------------------------------------------------

    return {
      success: true,
      data: {
        totalCustomers: totalCustomers ?? 0,
        totalDebts: debts?.length ?? 0,
        totalDebtAmount,
        totalPaidAmount,
        outstandingBalance:
          totalDebtAmount - totalPaidAmount,
        overdueDebts,
        totalPayments: totalPayments ?? 0,
        smsSent,
        smsFailed,
      },
    };

  } catch (error) {
    console.error(
      "Overview metrics error:",
      error
    );

    return {
      success: false,
      message: "Failed to load overview metrics.",
    };
  }
}