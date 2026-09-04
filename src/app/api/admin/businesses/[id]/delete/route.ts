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
    //    BEFORE the transactional DB deletion removes them.
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
    // 6. Atomically delete ALL public database records
    // ---------------------------------------------------------
    const { data: deletedData, error: deletionError } =
      await supabase.rpc("delete_business_data", {
        p_business_id: id,
      });

    if (deletionError) {
      console.error(
        "Atomic business database deletion failed:",
        deletionError,
      );

      return NextResponse.json(
        {
          error:
            "Business deletion failed. No business database records were deleted.",
          details: deletionError.message,
        },
        { status: 500 },
      );
    }

    const deletedCounts = {
      customers: Number(deletedData?.customers ?? 0),
      debts: Number(deletedData?.debts ?? 0),
      payments: Number(deletedData?.payments ?? 0),
      notifications: Number(deletedData?.notifications ?? 0),
      notification_queue: Number(
        deletedData?.notification_queue ?? 0,
      ),
      financial_transactions: Number(
        deletedData?.financial_transactions ?? 0,
      ),
      notification_templates: Number(
        deletedData?.notification_templates ?? 0,
      ),
      business_settings: Number(
        deletedData?.business_settings ?? 0,
      ),
      subscription_payments: Number(
        deletedData?.subscription_payments ?? 0,
      ),
      system_errors: Number(
        deletedData?.system_errors ?? 0,
      ),
      activity_logs: Number(
        deletedData?.activity_logs ?? 0,
      ),
      users: Number(deletedData?.users ?? 0),
      auth_users: authUserIds.length,
      business_requests: Number(
        deletedData?.business_requests ?? 0,
      ),
    };

    // ---------------------------------------------------------
    // 7. Delete Supabase Auth accounts
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
        "Supabase Auth deletion errors after database deletion:",
        authDeletionErrors,
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Business database records were deleted, but one or more authentication accounts could not be deleted.",
          authDeletionErrors,
          deleted: {
            business_id: business.id,
            business_code: business.business_code,
            ...deletedCounts,
          },
        },
        { status: 500 },
      );
    }

    // ---------------------------------------------------------
    // 8. Preserve a permanent audit record
    // ---------------------------------------------------------
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        business_id: null,
        user_id: adminUser.id,
        action: "DELETE_BUSINESS",
        target_type: "business",
        description:
          `Permanently deleted business ${business.business_code} (${business.business_name}).`,
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
