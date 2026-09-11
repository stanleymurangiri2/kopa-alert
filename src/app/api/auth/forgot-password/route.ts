import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants/support";

const COOLDOWN_MS = 60 * 1000;

// Product decision: tell the user directly when there's no account for
// that email, rather than a generic "if an account exists..." response.
// This does mean the endpoint can be used to check which emails are
// registered - the 60-second cooldown below at least stops it being used
// to spam a target's inbox with reset emails.
const SENT_MESSAGE = "A password reset link has been sent to your email.";
const NOT_FOUND_MESSAGE =
  "No KopaAlert account found for that email. Register your business to get started.";

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
      return NextResponse.json({
        success: false,
        notFound: true,
        message: NOT_FOUND_MESSAGE,
      });
    }

    const lastRequestAt = userRow.last_password_reset_request_at
      ? new Date(userRow.last_password_reset_request_at).getTime()
      : 0;

    if (Date.now() - lastRequestAt < COOLDOWN_MS) {
      // Within cooldown - don't send another email, but still report
      // success so a user double-clicking "send" isn't shown an error.
      return NextResponse.json({ success: true, message: SENT_MESSAGE });
    }

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "recovery",
        email: userRow.email,
        options: { redirectTo: redirectUrl },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Generate reset link error:", linkError);
      return NextResponse.json(
        { error: "Unable to generate reset link." },
        { status: 500 }
      );
    }

    const { sendEmail } = await import("@/lib/notifications/resend");
    const { passwordResetEmail } = await import(
      "@/lib/notifications/email-templates"
    );

    // Deliberately not using linkData.properties.action_link: that's a raw
    // {project-ref}.supabase.co URL, which makes this the only email in the
    // app linking off kopaalert.shop - a classic phishing signal that gets
    // it filtered/dropped by some mail providers with no bounce or error
    // anywhere to catch. hashed_token lets us build a same-domain link
    // instead; /reset-password verifies it client-side via verifyOtp().
    const resetUrl = `${redirectUrl}?token_hash=${encodeURIComponent(
      linkData.properties.hashed_token
    )}&type=recovery`;

    const emailResult = await sendEmail({
      to: userRow.email,
      subject: "Set a new KopaAlert password",
      html: passwordResetEmail({
        name: userRow.name ?? "there",
        reset_url: resetUrl,
        support_email: SUPPORT_EMAIL,
        support_phone: SUPPORT_PHONE,
      }),
    });

    if (!emailResult.success) {
      // sendEmail() never throws - it returns { success: false } on failure -
      // so this must be checked explicitly. Previously wasn't: a real Resend
      // failure (quota, rejected send, etc.) still reported success to the
      // user with no record anywhere that the email never went out.
      console.error("Forgot password: email send failed:", emailResult.error);
      return NextResponse.json(
        {
          success: false,
          error:
            "We generated your reset link but couldn't send the email. Please try again in a moment or contact support.",
        },
        { status: 502 }
      );
    }

    // Only stamp the cooldown once the email genuinely went out - stamping
    // it earlier meant a real send failure followed by a quick retry hit
    // the cooldown short-circuit above and reported false success, with no
    // email ever having been sent either time.
    await supabase
      .from("users")
      .update({ last_password_reset_request_at: new Date().toISOString() })
      .eq("id", userRow.id);

    return NextResponse.json({ success: true, message: SENT_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
