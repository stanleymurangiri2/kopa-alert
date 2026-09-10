import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants/support";

const COOLDOWN_MS = 60 * 1000;

// Always the same response whether or not the email is registered - a
// differential response here lets an attacker enumerate which business
// emails have KopaAlert accounts.
const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const redirectUrl = "https://kopaalert.shop/reset-password";

    const { data: userRow } = await supabase
      .from("users")
      .select("id, name, email, last_password_reset_request_at")
      .eq("email", email.trim())
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    const lastRequestAt = userRow.last_password_reset_request_at
      ? new Date(userRow.last_password_reset_request_at).getTime()
      : 0;

    if (Date.now() - lastRequestAt < COOLDOWN_MS) {
      // Within cooldown - don't send another email, but the response stays
      // identical so this can't be used to probe account existence either.
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email: userRow.email,
        options: { redirectTo: redirectUrl },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Generate reset link error:", linkError);
      return NextResponse.json(
        { error: "Unable to generate reset link." },
        { status: 500 }
      );
    }

    await supabase
      .from("users")
      .update({ last_password_reset_request_at: new Date().toISOString() })
      .eq("id", userRow.id);

    const { sendEmail } = await import("@/lib/notifications/resend");
    const { passwordResetEmail } = await import(
      "@/lib/notifications/email-templates"
    );

    await sendEmail({
      to: userRow.email,
      subject: "Reset your KopaAlert password",
      html: passwordResetEmail({
        name: userRow.name ?? "there",
        reset_url: linkData.properties.action_link,
        support_email: SUPPORT_EMAIL,
        support_phone: SUPPORT_PHONE,
      }),
    });

    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
