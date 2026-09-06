import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = [
  "resend_limit",
  "pending_request_auto_expire_days",
  "audit_log_retention_days",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

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

    const body = await request.json();
    const key = body?.key as AllowedKey;
    const rawValue = body?.value;

    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json({ error: "Invalid setting key." }, { status: 400 });
    }

    let value: number | null;

    if (rawValue === null || rawValue === "") {
      value = null;
    } else {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: "Value must be a positive whole number, or empty to disable." },
          { status: 400 }
        );
      }
      value = parsed;
    }

    if (key === "resend_limit" && value === null) {
      return NextResponse.json(
        { error: "Resend limit cannot be empty - enter a positive whole number." },
        { status: 400 }
      );
    }

    const { data: previous } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    const { error: upsertError } = await supabase.from("platform_settings").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: adminUser.id,
    });

    if (upsertError) {
      console.error("Platform setting update failed:", upsertError);
      return NextResponse.json(
        { error: upsertError.message ?? "Failed to update setting." },
        { status: 500 }
      );
    }

    await supabase.from("audit_logs").insert({
      user_id: adminUser.id,
      action: "UPDATE_PLATFORM_SETTING",
      target_type: "platform_settings",
      description: `Platform setting "${key}" changed from ${JSON.stringify(previous?.value ?? null)} to ${JSON.stringify(value)}`,
      details: { key, previous_value: previous?.value ?? null, new_value: value },
    });

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error("Platform setting update error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
