import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/sms/africastalking';
import {
  markNotificationSent,
  markNotificationFailed,
  incrementNotificationAttempt,
  decrementSmsBalance,
} from '@/lib/supabase/notifications';

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sessionClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        { success: false, error: 'Business profile not found.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'business_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('sms_balance')
      .eq('id', profile.business_id)
      .single();

    if (businessError) {
      throw businessError;
    }

    let balance = business?.sms_balance ?? 0;

    const { data: notifications, error: pendingError } = await supabaseAdmin
      .from('notification_queue')
      .select('*')
      .eq('business_id', profile.business_id)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (pendingError) {
      throw pendingError;
    }

    let sent = 0;
    let failed = 0;
    let skippedInsufficientBalance = 0;

    for (const notification of notifications ?? []) {
      if (balance <= 0) {
        skippedInsufficientBalance++;
        continue;
      }

      try {
        const result = await sendSMS(notification.recipient_phone, notification.message_body);

        if (!result.success) {
          await incrementNotificationAttempt(notification.id, notification.attempts);
          await markNotificationFailed(notification.id, result.error || 'SMS sending failed');
          failed++;
          continue;
        }

        await markNotificationSent(notification.id, result.messageId);
        balance = await decrementSmsBalance(profile.business_id);
        sent++;
      } catch (smsError) {
        await incrementNotificationAttempt(notification.id, notification.attempts);
        await markNotificationFailed(
          notification.id,
          smsError instanceof Error ? smsError.message : 'Unexpected SMS error'
        );
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: (notifications ?? []).length,
      sent,
      failed,
      skippedInsufficientBalance,
    });
  } catch (error) {
    console.error('Dispatch alerts error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error.' },
      { status: 500 }
    );
  }
}
