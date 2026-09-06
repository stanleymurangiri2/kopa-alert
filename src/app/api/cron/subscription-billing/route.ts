import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('process_subscription_billing_cycle');

    if (error) throw error;

    const rows = (data ?? []) as {
      out_business_id: string;
      out_business_name: string;
      out_email: string;
      out_action: 'locked' | 'reminder';
      out_subscription_expires_at: string;
      out_subscription_price: number;
    }[];

    let locked = 0;
    let reminded = 0;

    for (const row of rows) {
      try {
        const { sendEmail } = await import('@/lib/notifications/resend');
        const { subscriptionLockedNoticeEmail, subscriptionRenewalReminderEmail } =
          await import('@/lib/notifications/email-templates');

        const { data: businessAdmin } = await supabase
          .from('users')
          .select('name')
          .eq('business_id', row.out_business_id)
          .eq('role', 'business_admin')
          .limit(1)
          .maybeSingle();

        const name = businessAdmin?.name ?? 'there';

        if (row.out_action === 'locked') {
          await sendEmail({
            to: row.out_email,
            subject: 'Your KopaAlert Account Has Been Locked',
            html: subscriptionLockedNoticeEmail({
              name,
              business_name: row.out_business_name,
              amount: row.out_subscription_price,
              currency: 'KES',
              expires_at: row.out_subscription_expires_at,
              support_email: SUPPORT_EMAIL,
              support_phone: SUPPORT_PHONE,
            }),
          });
          locked++;
        } else {
          await sendEmail({
            to: row.out_email,
            subject: 'Your KopaAlert subscription renews soon',
            html: subscriptionRenewalReminderEmail({
              name,
              business_name: row.out_business_name,
              amount: row.out_subscription_price,
              currency: 'KES',
              expires_at: row.out_subscription_expires_at,
              support_email: SUPPORT_EMAIL,
              support_phone: SUPPORT_PHONE,
            }),
          });
          reminded++;
        }
      } catch (emailErr) {
        console.error(`Subscription billing email failed for business ${row.out_business_id}:`, emailErr);
      }

      try {
        await supabase.from('audit_logs').insert({
          business_id: row.out_business_id,
          action: row.out_action === 'locked' ? 'SUBSCRIPTION_LOCKED' : 'SUBSCRIPTION_RENEWAL_REMINDER_SENT',
          target_type: 'business',
          description:
            row.out_action === 'locked'
              ? `${row.out_business_name} was automatically locked after its subscription lapsed on ${row.out_subscription_expires_at}.`
              : `${row.out_business_name} was sent a renewal reminder ahead of its subscription expiring on ${row.out_subscription_expires_at}.`,
        });
      } catch {
        // best-effort audit log; the lock/reminder action itself already succeeded
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription billing cycle processed.',
      locked,
      reminded,
    });
  } catch (error: any) {
    console.error('Subscription Billing Cron Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
