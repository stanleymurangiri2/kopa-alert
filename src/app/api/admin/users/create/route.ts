import { NextRequest, NextResponse } from "next/server";
import { createSuperAdmin } from "@/lib/admin/create-super-admin";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const sessionClient = await createClient();

    const {
      data: { user: adminUser },
      error: adminAuthError,
    } = await sessionClient.auth.getUser();

    if (adminAuthError || !adminUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    if (adminProfileError || adminProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const result = await createSuperAdmin({ name, email });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: adminUser.id,
      action: "CREATE_SUPER_ADMIN",
      target_type: "user",
      description: `Granted Super Admin access to ${name} (${email})`,
      details: { created_user_id: result.userId, email_sent: result.emailSent },
    });

    if (auditError) {
      console.error("Audit log insert failed:", auditError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create super admin error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
