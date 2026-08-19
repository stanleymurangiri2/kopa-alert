
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface PaymentReportItem {
  id: string;
  debt_id: string;
  customer_name: string;
  phone: string;
  amount_paid: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

export interface PaymentMethodSummary {
  method: string;
  count: number;
  total: number;
}

export interface PaymentReportSummary {
  totalPayments: number;
  totalCollected: number;
  averagePayment: number;
  largestPayment: number;
  smallestPayment: number;
  methods: PaymentMethodSummary[];
}

export interface PaymentReportResult {
  success: boolean;
  summary?: PaymentReportSummary;
  payments?: PaymentReportItem[];
  message?: string;
}

export async function getPaymentReports(
  businessId: string,
  startDate?: string,
  endDate?: string
): Promise<PaymentReportResult> {
  try {
    // -------------------------------------------------------
    // Query payments
    // -------------------------------------------------------

    let query = supabase
      .from("payments")
      .select(`
        id,
        debt_id,
        amount_paid,
        payment_method,
        notes,
        created_at,
        debts!inner (
          customer_id,
          business_id,
          customers (
            full_name,
            phone
          )
        )
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    const payments: PaymentReportItem[] = [];
    const methodTotals = new Map<
      string,
      { count: number; total: number }
    >();

    let totalCollected = 0;
    let largestPayment = 0;
    let smallestPayment = Number.MAX_SAFE_INTEGER;

    for (const row of data ?? []) {
      const debt = Array.isArray(row.debts)
        ? row.debts[0]
        : row.debts;

      const customer = debt?.customers
        ? Array.isArray(debt.customers)
          ? debt.customers[0]
          : debt.customers
        : null;

      const amount = Number(row.amount_paid);

      totalCollected += amount;

      largestPayment = Math.max(
        largestPayment,
        amount
      );

      smallestPayment = Math.min(
        smallestPayment,
        amount
      );

      const existing =
        methodTotals.get(row.payment_method) ?? {
          count: 0,
          total: 0,
        };

      existing.count += 1;
      existing.total += amount;

      methodTotals.set(
        row.payment_method,
        existing
      );

      payments.push({
        id: row.id,
        debt_id: row.debt_id,
        customer_name:
          customer?.full_name ?? "Unknown",
        phone: customer?.phone ?? "",
        amount_paid: amount,
        payment_method: row.payment_method,
        notes: row.notes,
        created_at: row.created_at,
      });
    }

    if (payments.length === 0) {
      smallestPayment = 0;
    }

    return {
      success: true,
      payments,
      summary: {
        totalPayments: payments.length,
        totalCollected,
        averagePayment:
          payments.length > 0
            ? totalCollected / payments.length
            : 0,
        largestPayment,
        smallestPayment,
        methods: [...methodTotals.entries()].map(
          ([method, values]) => ({
            method,
            count: values.count,
            total: values.total,
          })
        ),
      },
    };
  } catch (error) {
    console.error(
      "Payment reports error:",
      error
    );

    return {
      success: false,
      message:
        "Failed to generate payment report.",
    };
  }
}
