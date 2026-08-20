import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const redirectUrl = "https://kopa-alert.vercel.app/reset-password";

    const { data: userRow } = await supabase
      .from("users")
      .select("name, email")
      .eq("email", email.trim())
      .maybeSingle();

    // Always return a generic success message, whether or not the email
    // exists, so this endpoint can't be used to check which emails are
    // registered.
    if (!userRow) {
      return NextResponse.json({
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      });
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
        support_email: "solutiontechcampany@gmail.com",
        support_phone: "+254740305253",
      }),
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
