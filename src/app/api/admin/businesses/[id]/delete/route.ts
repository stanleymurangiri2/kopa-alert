import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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
    // 2. Get business ID and confirmation
    // ---------------------------------------------------------
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Business ID is required." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const confirmName = String(body?.confirmName ?? "").trim();

    // ---------------------------------------------------------
    // 3. Load business
    // ---------------------------------------------------------
    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select(
          "id, business_code, business_name, email, phone, status",
        )
        .eq("id", id)
        .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404 },
      );
    }

    if (confirmName !== business.business_name) {
      return NextResponse.json(
        {
          error:
            "Confirmation text does not match the business name.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 4. Find all users belonging to this business
    // ---------------------------------------------------------
    const { data: businessUsers, error: usersLookupError } =
      await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("business_id", id);

    if (usersLookupError) {
      return NextResponse.json(
        {
          error:
            "Failed to identify business user accounts. No data was deleted.",
        },
        { status: 500 },
      );
    }

    const authUserIds = (businessUsers ?? [])
      .map((user) => user.id)
      .filter(Boolean);

    // ---------------------------------------------------------
    // 5. Verify the associated approved business request
    // ---------------------------------------------------------
    const { data: matchingRequests, error: requestLookupError } =
      await supabase
        .from("business_requests")
        .select("id, business_name, email, status")
        .eq("email", business.email)
        .eq("business_name", business.business_name)
        .eq("status", "approved");

    if (requestLookupError) {
      return NextResponse.json(
        {
          error:
            "Failed to identify the associated business request. No data was deleted.",
        },
        { status: 500 },
      );
    }

    if ((matchingRequests ?? []).length > 1) {
      return NextResponse.json(
        {
          error:
            "Multiple approved business requests match this business. Deletion was stopped to prevent deleting the wrong requests.",
        },
        { status: 409 },
      );
    }

    // ---------------------------------------------------------
    // 6. Capture ALL deletion counts before deleting anything
    // ---------------------------------------------------------
    const [
      customersResult,
      debtsResult,
      paymentsResult,
      notificationsResult,
      notificationQueueResult,
      financialTransactionsResult,
      notificationTemplatesResult,
      businessSettingsResult,
      subscriptionPaymentsResult,
      systemErrorsResult,
      activityLogsResult,
      usersResult,
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

      supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),
    ]);

    // ---------------------------------------------------------
    // 7. STOP if any preflight query failed
    // ---------------------------------------------------------
    const countResults = [
      customersResult,
      debtsResult,
      paymentsResult,
      notificationsResult,
      notificationQueueResult,
      financialTransactionsResult,
      notificationTemplatesResult,
      businessSettingsResult,
      subscriptionPaymentsResult,
      systemErrorsResult,
      activityLogsResult,
      usersResult,
    ];

    const failedCountQuery = countResults.find(
      (result) => result.error,
    );

    if (failedCountQuery?.error) {
      console.error(
        "Business deletion preflight failed:",
        failedCountQuery.error,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify all business data before deletion. No data was deleted.",
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 8. Delete dependent records FIRST
    // ---------------------------------------------------------

    const { error: notificationQueueError } = await supabase
      .from("notification_queue")
      .delete()
      .eq("business_id", id);

    if (notificationQueueError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete notification queue: " +
            notificationQueueError.message,
        },
        { status: 500 },
      );
    }

    const { error: paymentsError } = await supabase
      .from("payments")
      .delete()
      .eq("business_id", id);

    if (paymentsError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete payments: " +
            paymentsError.message,
        },
        { status: 500 },
      );
    }

    const { error: financialTransactionsError } =
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("business_id", id);

    if (financialTransactionsError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete financial transactions: " +
            financialTransactionsError.message,
        },
        { status: 500 },
      );
    }

    const { error: debtsError } = await supabase
      .from("debts")
      .delete()
      .eq("business_id", id);

    if (debtsError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete debts: " +
            debtsError.message,
        },
        { status: 500 },
      );
    }

    const { error: customersError } = await supabase
      .from("customers")
      .delete()
      .eq("business_id", id);

    if (customersError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete customers: " +
            customersError.message,
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 9. Delete remaining business-owned records
    // ---------------------------------------------------------
    const businessOwnedTables = [
      "notifications",
      "notification_templates",
      "business_settings",
      "subscription_payments",
      "system_errors",
    ] as const;

    for (const table of businessOwnedTables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("business_id", id);

      if (error) {
        return NextResponse.json(
          {
            error:
              `Failed to delete ${table}: ${error.message}`,
          },
          { status: 500 },
        );
      }
    }

    // ---------------------------------------------------------
    // 10. Delete activity logs before users
    // ---------------------------------------------------------
    const { error: activityLogsError } = await supabase
      .from("activity_logs")
      .delete()
      .eq("business_id", id);

    if (activityLogsError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete activity logs: " +
            activityLogsError.message,
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 11. Delete public user profiles
    // ---------------------------------------------------------
    const { error: usersDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("business_id", id);

    if (usersDeleteError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete business users: " +
            usersDeleteError.message,
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 12. Delete Supabase Auth accounts
    // ---------------------------------------------------------
    const authDeletionErrors: string[] = [];

    for (const authUserId of authUserIds) {
      const { error } =
        await supabase.auth.admin.deleteUser(authUserId);

      if (error) {
        authDeletionErrors.push(
          `${authUserId}: ${error.message}`,
        );
      }
    }

    if (authDeletionErrors.length > 0) {
      console.error(
        "Supabase Auth deletion errors:",
        authDeletionErrors,
      );

      return NextResponse.json(
        {
          error:
            "Business data was deleted, but one or more authentication accounts could not be deleted.",
          authDeletionErrors,
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 13. Delete the exact associated business request
    // ---------------------------------------------------------
    if (matchingRequests && matchingRequests.length === 1) {
      const requestId = matchingRequests[0].id;

      const { error: requestDeleteError } = await supabase
        .from("business_requests")
        .delete()
        .eq("id", requestId);

      if (requestDeleteError) {
        return NextResponse.json(
          {
            error:
              "Business data was deleted, but the associated business request could not be deleted: " +
              requestDeleteError.message,
          },
          { status: 500 },
        );
      }
    }

    // ---------------------------------------------------------
    // 14. Delete the business itself
    // ---------------------------------------------------------
    const { error: businessDeleteError } = await supabase
      .from("businesses")
      .delete()
      .eq("id", id);

    if (businessDeleteError) {
      return NextResponse.json(
        {
          error:
            "Failed to delete the business record: " +
            businessDeleteError.message,
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 15. Keep a permanent audit record
    // ---------------------------------------------------------
    const deletedCounts = {
      customers: customersResult.count ?? 0,
      debts: debtsResult.count ?? 0,
      payments: paymentsResult.count ?? 0,
      notifications: notificationsResult.count ?? 0,
      notification_queue: notificationQueueResult.count ?? 0,
      financial_transactions:
        financialTransactionsResult.count ?? 0,
      notification_templates:
        notificationTemplatesResult.count ?? 0,
      business_settings:
        businessSettingsResult.count ?? 0,
      subscription_payments:
        subscriptionPaymentsResult.count ?? 0,
      system_errors: systemErrorsResult.count ?? 0,
      activity_logs: activityLogsResult.count ?? 0,
      users: usersResult.count ?? 0,
      auth_users: authUserIds.length,
      business_requests:
        matchingRequests?.length === 1 ? 1 : 0,
    };

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        business_id: null,
        user_id: adminUser.id,
        action: "DELETE_BUSINESS",
        target_type: "business",
        description:
          `Permanently deleted business "${business.business_name}" and all associated data`,
        details: {
          business_id: business.id,
          business_code: business.business_code,
          business_name: business.business_name,
          email: business.email,
          phone: business.phone,
          status: business.status,
          deleted_counts: deletedCounts,
          deleted_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error(
        "Audit log failed after deletion:",
        auditError,
      );
    }

    return NextResponse.json({
      success: true,
      message:
        `Business "${business.business_name}" and all associated data were permanently deleted.`,
      deleted: {
        business_id: business.id,
        business_code: business.business_code,
        ...deletedCounts,
      },
    });
  } catch (error) {
    console.error("Delete business error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
