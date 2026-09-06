import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants/support";

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
      .select("name, email")
      .eq("email", email.trim())
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({
        success: false,
        notFound: true,
        message: "No KopaAlert account found for that email. Register your business to get started.",
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
        support_email: SUPPORT_EMAIL,
        support_phone: SUPPORT_PHONE,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "A reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
