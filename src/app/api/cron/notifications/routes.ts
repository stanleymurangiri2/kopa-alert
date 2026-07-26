import { NextResponse } from 'next/server';

import {
  generateDailyReminders,
} from '@/lib/supabase/notifications';

import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  incrementNotificationAttempt,
} from '@/lib/supabase/notifications';

import { sendSMS } from '@/lib/sms/africastalking';



export async function GET(request: Request) {

  try {


    // Optional security check for cron requests

    const authHeader =
      request.headers.get('authorization');


    const cronSecret =
      process.env.CRON_SECRET;


    if (
      cronSecret &&
      authHeader !== `Bearer ${cronSecret}`
    ) {

      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      );

    }



    /**
     * Step 1:
     * Generate today's reminders
     * from active templates
     */

    const generated =
      await generateDailyReminders();



    /**
     * Step 2:
     * Fetch pending queue messages
     */

    const {
      data: notifications,
      error,
    } =
      await getPendingNotifications();



    if (error) {

      throw error;

    }



    let sent = 0;
    let failed = 0;



    /**
     * Step 3:
     * Send SMS messages
     */

    for (const notification of notifications || []) {


      try {


        const result =
          await sendSMS(
            notification.recipient_phone,
            notification.message_body
          );



        if (!result.success) {


          await incrementNotificationAttempt(
            notification.id,
            notification.attempts
          );


          await markNotificationFailed(
            notification.id,
            result.error ||
            'SMS sending failed'
          );


          failed++;

          continue;

        }



        await markNotificationSent(
          notification.id
        );


        sent++;



      } catch (error: any) {


        await incrementNotificationAttempt(
          notification.id,
          notification.attempts
        );


        await markNotificationFailed(
          notification.id,
          error.message ||
          'Unexpected SMS error'
        );


        failed++;

      }

    }



    return NextResponse.json({

      success: true,

      message:
        'Notification cron completed',

      generated,

      processed:
        notifications?.length || 0,

      sent,

      failed,

    });



  } catch (error: any) {


    console.error(
      'Notification Cron Error:',
      error
    );


    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'Cron execution failed',
      },
      {
        status: 500,
      }
    );

  }

}