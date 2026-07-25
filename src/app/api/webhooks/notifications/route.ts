// Location: app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
// Inline fallback for alert email template to avoid module resolution errors
function AlertEmailTemplate({ userName, title, message, actionUrl }: { userName: string; title: string; message: string; actionUrl?: string }) {
  const actionHtml = actionUrl ? `<p><a href="${actionUrl}" style="color:#1a73e8">View details</a></p>` : '';
  return `
    <div style="font-family:Arial, sans-serif; line-height:1.4; color:#111">
      <h2 style="margin:0 0 8px 0">${title}</h2>
      <p style="margin:0 0 12px 0">Hi ${userName},</p>
      <p style="margin:0 0 12px 0">${message}</p>
      ${actionHtml}
    </div>
  `;
}

let resend: Resend | null = null;
function getResendClient() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Use service role for backend operations bypassing RLS on insert
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId, userId, userEmail, userName, title, message, type, actionUrl } = body;

    if (!tenantId || !userId || !title || !message) {
      return NextResponse.json({ error: 'Missing required payload fields' }, { status: 400 });
    }

    // 1. Insert in-app notification record
    const { error: dbError } = await getSupabaseAdmin()
      .from('notifications')
      .insert([
        {
          tenant_id: tenantId,
          user_id: userId,
          title,
          message,
          type: type || 'info',
        },
      ]);

    if (dbError) throw dbError;

    // 2. Dispatch email notification if user email is provided
    if (userEmail) {
      await getResendClient().emails.send({
        from: 'Notifications <notifications@yourdomain.com>',
        to: [userEmail],
        subject: title,
        react: AlertEmailTemplate({ userName: userName || 'User', title, message, actionUrl }),
      });
    }

    return NextResponse.json({ success: true, message: 'Notification dispatched successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}