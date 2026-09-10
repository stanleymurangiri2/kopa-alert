import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["upcoming", "due_today", "overdue"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

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
    const type = body?.type as AllowedType;
    const channel = "sms" as const;
    const messageTemplate =
      typeof body?.message_template === "string" ? body.message_template.trim() : "";
    const daysOffset = Number(body?.days_offset);
    const isActive = Boolean(body?.is_active);

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid template type." }, { status: 400 });
    }

    if (!messageTemplate) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (!Number.isFinite(daysOffset) || !Number.isInteger(daysOffset)) {
      return NextResponse.json(
        { error: "Days offset must be a whole number." },
        { status: 400 }
      );
    }

    const { data: previous } = await supabase
      .from("platform_notification_templates")
      .select("message_template, days_offset, is_active")
      .eq("type", type)
      .eq("channel", channel)
      .maybeSingle();

    const { error: upsertError } = await supabase
      .from("platform_notification_templates")
      .upsert({
        type,
        channel,
        message_template: messageTemplate,
        days_offset: daysOffset,
        is_active: isActive,
        updated_at: new Date().toISOString(),
        updated_by: adminUser.id,
      });

    if (upsertError) {
      console.error("Platform template update failed:", upsertError);
      return NextResponse.json(
        { error: upsertError.message ?? "Failed to update template." },
        { status: 500 }
      );
    }

    // Cascade to every business - this is the whole point: one edit here
    // updates what every business's reminders actually say.
    const { error: cascadeError, count } = await supabase
      .from("notification_templates")
      .update(
        {
          message_template: messageTemplate,
          days_offset: daysOffset,
          is_active: isActive,
        },
        { count: "exact" }
      )
      .eq("type", type)
      .eq("channel", channel);

    if (cascadeError) {
      console.error("Cascading template update failed:", cascadeError);
      return NextResponse.json(
        { error: cascadeError.message ?? "Saved platform default, but failed to update businesses." },
        { status: 500 }
      );
    }

    await supabase.from("audit_logs").insert({
      user_id: adminUser.id,
      action: "UPDATE_PLATFORM_SMS_TEMPLATE",
      target_type: "platform_notification_templates",
      description: `SMS template "${type}" updated and applied to ${count ?? 0} business(es)`,
      details: {
        type,
        channel,
        previous,
        new_message_template: messageTemplate,
        new_days_offset: daysOffset,
        new_is_active: isActive,
        businesses_updated: count ?? 0,
      },
    });

    return NextResponse.json({ success: true, businessesUpdated: count ?? 0 });
  } catch (error) {
    console.error("Platform SMS template update error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
