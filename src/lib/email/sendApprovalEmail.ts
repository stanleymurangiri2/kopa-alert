import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface ApprovalEmailProps {
  businessName: string;
  ownerName: string;
  email: string;
}

export async function sendApprovalEmail({
  businessName,
  ownerName,
  email,
}: ApprovalEmailProps) {
  if (!resend) {
    console.log("RESEND_API_KEY not configured.");
    return;
  }

  await resend.emails.send({
    from: "KopaAlert <noreply@yourdomain.com>",
    to: email,
    subject: "Your KopaAlert account has been approved",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Welcome to KopaAlert 🎉</h2>

        <p>Hello <strong>${ownerName}</strong>,</p>

        <p>Your business <strong>${businessName}</strong> has been approved successfully.</p>

        <p>You can now access your account using the link below.</p>

        <p>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login"
             style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">
             Login to KopaAlert
          </a>
        </p>

        <p>Thank you for choosing KopaAlert.</p>

        <hr>

        <small>
          KopaAlert • Smart Debt Reminder Platform
        </small>
      </div>
    `,
  });
}