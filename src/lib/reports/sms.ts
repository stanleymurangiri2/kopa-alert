
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface SmsReportItem {
  id: string;
  customer_name: string | null;
  phone: string;
  message: string;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  cost: number;
  sent_at: string | null;
  created_at: string;
}

export interface SmsDailyTrend {
  date: string;
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}

export interface SmsReportSummary {
  totalMessages: number;
  delivered: number;
  failed: number;
  pending: number;
  queued: number;
  deliveryRate: number;
  totalCost: number;
}

export interface SmsReportResult {
  success: boolean;
  summary?: SmsReportSummary;
  trends?: SmsDailyTrend[];
  messages?: SmsReportItem[];
  message?: string;
}

export async function getSmsReports(
  businessId: string,
  startDate?: string,
  endDate?: string
): Promise<SmsReportResult> {
  try {
    let query = supabase
      .from("notification_queue")
      .select(`
        id,
        phone,
        message,
        status,
        provider,
        provider_message_id,
        cost,
        sent_at,
        created_at,
        customer_id,
        customers(
          full_name
        )
      `)
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
      data,
      error,
    } = await query;

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    const messages: SmsReportItem[] = [];

    let delivered = 0;
    let failed = 0;
    let pending = 0;
    let queued = 0;
    let totalCost = 0;

    const trendMap = new Map<
      string,
      SmsDailyTrend
    >();

    for (const row of data ?? []) {
      const customer = Array.isArray(
        row.customers
      )
        ? row.customers[0]
        : row.customers;

      const cost = Number(row.cost ?? 0);

      totalCost += cost;

      switch (row.status) {
        case "sent":
        case "delivered":
          delivered++;
          break;

        case "failed":
          failed++;
          break;

        case "pending":
          pending++;
          break;

        case "queued":
          queued++;
          break;
      }

      const day = new Date(
        row.created_at
      )
        .toISOString()
        .split("T")[0];

      const trend =
        trendMap.get(day) ?? {
          date: day,
          total: 0,
          delivered: 0,
          failed: 0,
          pending: 0,
        };

      trend.total++;

      switch (row.status) {
        case "sent":
        case "delivered":
          trend.delivered++;
          break;

        case "failed":
          trend.failed++;
          break;

        case "pending":
        case "queued":
          trend.pending++;
          break;
      }

      trendMap.set(day, trend);

      messages.push({
        id: row.id,
        customer_name:
          customer?.full_name ?? null,
        phone: row.phone,
        message: row.message,
        status: row.status,
        provider: row.provider,
        provider_message_id:
          row.provider_message_id,
        cost,
        sent_at: row.sent_at,
        created_at: row.created_at,
      });
    }

    const totalMessages =
      messages.length;

    const deliveryRate =
      totalMessages === 0
        ? 0
        : Number(
            (
              (delivered /
                totalMessages) *
              100
            ).toFixed(2)
          );

    return {
      success: true,
      summary: {
        totalMessages,
        delivered,
        failed,
        pending,
        queued,
        deliveryRate,
        totalCost,
      },
      trends: [...trendMap.values()].sort(
        (a, b) =>
          a.date.localeCompare(b.date)
      ),
      messages,
    };
  } catch (error) {
    console.error(
      "SMS report error:",
      error
    );

    return {
      success: false,
      message:
        "Failed to generate SMS report.",
    };
  }
}