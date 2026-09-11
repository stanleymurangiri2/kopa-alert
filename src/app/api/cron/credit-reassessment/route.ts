import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/utils/verify-cron-secret";
import { assessCustomerCredit } from "@/lib/credit/assess";
import { getLatestAssessment } from "@/lib/supabase/credit";

export const dynamic = "force-dynamic";

/**
 * Catches the one gap the lazy on-demand recalculation (triggered when a
 * customer's page is viewed) can't cover: a debt going overdue purely by the
 * passage of time, with no new debt/payment write to detect as "stale."
 * New debts and payments already invalidate the cached assessment on their
 * own (see src/app/api/credit/latest/route.ts's staleness check) - this
 * sweep exists for customers nobody happens to view.
 */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: debts, error: debtsError } = await supabaseAdmin
      .from("debts")
      .select("business_id, customer_id");

    if (debtsError) throw debtsError;

    const uniqueCustomers = new Map<string, { businessId: string; customerId: string }>();
    for (const debt of debts ?? []) {
      uniqueCustomers.set(debt.customer_id, { businessId: debt.business_id, customerId: debt.customer_id });
    }

    let assessed = 0;
    let skippedFresh = 0;
    let failed = 0;

    for (const { businessId, customerId } of uniqueCustomers.values()) {
      try {
        const { data: existing } = await getLatestAssessment(supabaseAdmin, businessId, customerId);

        const isFresh =
          existing &&
          existing.status !== "FAILED" &&
          !existing.applied &&
          Date.now() - new Date(existing.created_at).getTime() < STALE_AFTER_MS;

        if (isFresh) {
          skippedFresh++;
          continue;
        }

        const result = await assessCustomerCredit(supabaseAdmin, businessId, customerId, null);
        if (result.status === "FAILED") {
          failed++;
        } else {
          assessed++;
        }
      } catch (err) {
        failed++;
        console.error(`Credit reassessment failed for customer ${customerId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Scheduled credit reassessment complete.",
      totalCustomers: uniqueCustomers.size,
      assessed,
      skippedFresh,
      failed,
    });
  } catch (error) {
    console.error("Credit Reassessment Cron Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
