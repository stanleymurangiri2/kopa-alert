import { NextResponse } from 'next/server';
import {
  generateDailyReminders,
  getPendingNotifications,
  getRetryableNotifications,
  markNotificationSent,
  markNotificationFailed,
  incrementNotificationAttempt,
  decrementSmsBalance,
} from '@/lib/supabase/notifications';
import { sendSMS } from '@/lib/sms/africastalking';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/utils/verify-cron-secret';

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;

export async function GET(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const generated = await generateDailyReminders();

    const { data: pending, error: pendingError } = await getPendingNotifications();
    if (pendingError) throw pendingError;

    const { data: retryable, error: retryError } = await getRetryableNotifications(MAX_ATTEMPTS);
    if (retryError) throw retryError;

    const notifications = [...(pending || []), ...(retryable || [])];

    // -------------------------------------------------------
    // Load current SMS balance for every business represented
    // in this batch, so we don't send past a depleted balance.
    // -------------------------------------------------------

    const businessIds = [...new Set(notifications.map((n) => n.business_id))];

    const balances = new Map<string, number>();

    if (businessIds.length > 0) {
      const { data: businesses, error: businessesError } = await supabaseAdmin
        .from('businesses')
        .select('id, sms_balance')
        .in('id', businessIds);

      if (businessesError) throw businessesError;

      for (const business of businesses ?? []) {
        balances.set(business.id, business.sms_balance ?? 0);
      }
    }

    let sent = 0;
    let failed = 0;
    let gaveUp = 0;
    let skippedInsufficientBalance = 0;

    for (const notification of notifications) {
      const balance = balances.get(notification.business_id) ?? 0;

      if (balance <= 0) {
        skippedInsufficientBalance++;
        continue;
      }

      try {
        const result = await sendSMS(
          notification.recipient_phone,
          notification.message_body
        );

        if (!result.success) {
          const newAttempts = notification.attempts + 1;

          await incrementNotificationAttempt(
            notification.id,
            notification.attempts
          );

          await markNotificationFailed(
            notification.id,
            result.error || 'SMS sending failed'
          );

          if (newAttempts >= MAX_ATTEMPTS) {
            gaveUp++;
          }

          failed++;
          continue;
        }

        await markNotificationSent(notification.id, result.messageId);
        sent++;

        const newBalance = await decrementSmsBalance(notification.business_id);
        balances.set(notification.business_id, newBalance);
      } catch (error: any) {
        await incrementNotificationAttempt(
          notification.id,
          notification.attempts
        );

        await markNotificationFailed(
          notification.id,
          error.message || 'Unexpected SMS error'
        );

        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification cron completed',
      generated,
      processed: notifications.length,
      sent,
      failed,
      gaveUpPermanently: gaveUp,
      skippedInsufficientBalance,
    });
  } catch (error: any) {
    console.error('Notification Cron Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Cron execution failed',
      },
      { status: 500 }
    );
  }
}