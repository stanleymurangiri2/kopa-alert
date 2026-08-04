import { NextResponse } from 'next/server';
import {
  generateDailyReminders,
  getPendingNotifications,
  getRetryableNotifications,
  markNotificationSent,
  markNotificationFailed,
  incrementNotificationAttempt,
} from '@/lib/supabase/notifications';
import { sendSMS } from '@/lib/sms/africastalking';

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

    let sent = 0;
    let failed = 0;
    let gaveUp = 0;

    for (const notification of notifications) {
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