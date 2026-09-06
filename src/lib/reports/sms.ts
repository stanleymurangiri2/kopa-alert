
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface SmsReportItem {
  id: string;
  customer_name: string | null;
  phone: string;
  message: string;
  channel: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface SmsDailyTrend {
  date: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
}

export interface SmsReportSummary {
  totalMessages: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
  deliveryRate: number;
}

export interface SmsReportResult {
  success: boolean;
  summary?: SmsReportSummary;
  trends?: SmsDailyTrend[];
  messages?: SmsReportItem[];
  message?: string;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
        recipient_phone,
        message_body,
        channel,
        status,
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
      const endOfDay = new Date(`${endDate}T00:00:00`);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query = query.lt(
        "created_at",
        endOfDay.toISOString()
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

    let sent = 0;
    let failed = 0;
    let pending = 0;
    let cancelled = 0;

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

      switch (row.status) {
        case "sent":
          sent++;
          break;

        case "failed":
          failed++;
          break;

        case "pending":
          pending++;
          break;

        case "cancelled":
          cancelled++;
          break;
      }

      const day = dateKey(new Date(row.created_at));

      const trend =
        trendMap.get(day) ?? {
          date: day,
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0,
          cancelled: 0,
        };

      trend.total++;

      switch (row.status) {
        case "sent":
          trend.sent++;
          break;

        case "failed":
          trend.failed++;
          break;

        case "pending":
          trend.pending++;
          break;

        case "cancelled":
          trend.cancelled++;
          break;
      }

      trendMap.set(day, trend);

      messages.push({
        id: row.id,
        customer_name:
          customer?.full_name ?? null,
        phone: row.recipient_phone,
        message: row.message_body,
        channel: row.channel,
        status: row.status,
        sent_at: row.sent_at,
        created_at: row.created_at,
      });
    }

    const totalMessages =
      messages.length;

    const deliveryRate =
      sent + failed === 0
        ? 0
        : Number(
            (
              (sent /
                (sent + failed)) *
              100
            ).toFixed(2)
          );

    return {
      success: true,
      summary: {
        totalMessages,
        sent,
        failed,
        pending,
        cancelled,
        deliveryRate,
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
