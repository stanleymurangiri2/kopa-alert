import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { getPlatformSetting } from '@/lib/supabase/platform-settings';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants/support';
import { verifyCronSecret } from '@/lib/utils/verify-cron-secret';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let expiredCount = 0;
    let purgedCount = 0;

    const autoExpireDays = await getPlatformSetting<number | null>(
      supabase,
      'pending_request_auto_expire_days',
      null
    );

    if (autoExpireDays) {
      const { data, error } = await supabase.rpc('expire_stale_pending_requests', {
        p_days: autoExpireDays,
      });

      if (error) throw error;

      const rows = (data ?? []) as {
        out_id: string;
        out_business_name: string;
        out_owner_name: string;
        out_email: string;
      }[];

      expiredCount = rows.length;

      for (const row of rows) {
        try {
          const { sendEmail } = await import('@/lib/notifications/resend');
          const { rejectionEmail } = await import('@/lib/notifications/email-templates');

          const emailResult = await sendEmail({
            to: row.out_email,
            subject: 'Update on Your KopaAlert Business Registration',
            html: rejectionEmail({
              owner_name: row.out_owner_name,
              business_name: row.out_business_name,
              reason: `Your registration was not reviewed within our standard ${autoExpireDays}-day window and has expired. Please submit a new registration if you'd still like to join KopaAlert.`,
              support_email: SUPPORT_EMAIL,
              support_phone: SUPPORT_PHONE,
            }),
          });

          if (!emailResult.success) {
            console.error(`Auto-expire rejection email failed for ${row.out_email}:`, emailResult.error);
          }
        } catch (emailErr) {
          console.error(`Auto-expire rejection email failed for ${row.out_email}:`, emailErr);
        }

        try {
          await supabase.from('audit_logs').insert({
            action: 'AUTO_EXPIRE_PENDING_REQUEST',
            target_type: 'business_request',
            description: `${row.out_business_name}'s registration auto-expired after ${autoExpireDays} days with no review.`,
            details: { request_id: row.out_id, auto_expire_days: autoExpireDays },
          });
        } catch {
          // best-effort audit log; the expiry itself already succeeded
        }
      }
    }

    const retentionDays = await getPlatformSetting<number | null>(
      supabase,
      'audit_log_retention_days',
      null
    );

    if (retentionDays) {
      const { data, error } = await supabase.rpc('purge_old_audit_logs', {
        p_days: retentionDays,
      });

      if (error) throw error;

      purgedCount = Number(data ?? 0);

      if (purgedCount > 0) {
        try {
          await supabase.from('audit_logs').insert({
            action: 'PURGE_AUDIT_LOGS',
            target_type: 'platform_settings',
            description: `Purged ${purgedCount} audit log entr${purgedCount === 1 ? 'y' : 'ies'} older than ${retentionDays} days.`,
            details: { retention_days: retentionDays, purged_count: purgedCount },
          });
        } catch {
          // best-effort audit log; the purge itself already succeeded
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Platform maintenance cycle complete.',
      expiredCount,
      purgedCount,
    });
  } catch (error: any) {
    console.error('Platform Maintenance Cron Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
