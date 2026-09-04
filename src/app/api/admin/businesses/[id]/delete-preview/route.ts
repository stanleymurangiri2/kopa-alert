import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ---------------------------------------------------------
    // 1. Verify the logged-in administrator
    // ---------------------------------------------------------
    const sessionClient = await createClient();

    const {
      data: { user: adminUser },
      error: adminAuthError,
    } = await sessionClient.auth.getUser();

    if (adminAuthError || !adminUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    // ---------------------------------------------------------
    // 2. Verify Super Admin role
    // ---------------------------------------------------------
    const { data: adminProfile, error: adminProfileError } =
      await supabase
        .from("users")
        .select("role")
        .eq("id", adminUser.id)
        .single();

    if (
      adminProfileError ||
      adminProfile?.role !== "super_admin"
    ) {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 },
      );
    }

    // ---------------------------------------------------------
    // 3. Validate business ID
    // ---------------------------------------------------------
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Business ID is required." },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 4. Verify business exists
    // ---------------------------------------------------------
    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select("id, business_name, status")
        .eq("id", id)
        .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404 },
      );
    }

    // ---------------------------------------------------------
    // 5. Count ALL business-owned records
    // ---------------------------------------------------------
    const [
      customersResult,
      debtsResult,
      paymentsResult,
      notificationsResult,
      notificationQueueResult,
      usersResult,
      financialTransactionsResult,
      notificationTemplatesResult,
      businessSettingsResult,
      subscriptionPaymentsResult,
      systemErrorsResult,
      activityLogsResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("debts")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("notification_queue")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("financial_transactions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("notification_templates")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("business_settings")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("subscription_payments")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("system_errors")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),

      supabase
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),
    ]);

    // ---------------------------------------------------------
    // 6. Stop if ANY count query failed
    // ---------------------------------------------------------
    const countResults = [
      customersResult,
      debtsResult,
      paymentsResult,
      notificationsResult,
      notificationQueueResult,
      usersResult,
      financialTransactionsResult,
      notificationTemplatesResult,
      businessSettingsResult,
      subscriptionPaymentsResult,
      systemErrorsResult,
      activityLogsResult,
    ];

    const failedQuery = countResults.find(
      (result) => result.error,
    );

    if (failedQuery?.error) {
      console.error(
        "Delete preview query failed:",
        failedQuery.error,
      );

      return NextResponse.json(
        {
          error:
            "Failed to load complete business deletion preview.",
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 7. Return complete deletion preview
    // ---------------------------------------------------------
    return NextResponse.json({
      success: true,

      business: {
        id: business.id,
        business_name: business.business_name,
        status: business.status,
      },

      counts: {
        customers: customersResult.count ?? 0,
        debts: debtsResult.count ?? 0,
        payments: paymentsResult.count ?? 0,
        notifications: notificationsResult.count ?? 0,
        notification_queue: notificationQueueResult.count ?? 0,
        users: usersResult.count ?? 0,
        financial_transactions:
          financialTransactionsResult.count ?? 0,
        notification_templates:
          notificationTemplatesResult.count ?? 0,
        business_settings:
          businessSettingsResult.count ?? 0,
        subscription_payments:
          subscriptionPaymentsResult.count ?? 0,
        system_errors:
          systemErrorsResult.count ?? 0,
        activity_logs:
          activityLogsResult.count ?? 0,
      },
    });
  } catch (error) {
    console.error("Delete preview error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
