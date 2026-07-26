import { NextResponse } from 'next/server';

import { sendSMS } from '@/lib/sms/africastalking';

import {
  getPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  incrementNotificationAttempt,
} from '@/lib/supabase/notifications';



export async function POST() {

  try {

    const {
      data: notifications,
      error,
    } = await getPendingNotifications();


    if (error) {
      throw error;
    }


    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending notifications',
        processed: 0,
      });
    }



    let sent = 0;
    let failed = 0;



    for (const notification of notifications) {

      try {


        const result = await sendSMS(
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
            result.error || 'SMS sending failed'
          );


          failed++;

          continue;
        }



        await markNotificationSent(
          notification.id
        );


        sent++;



      } catch (smsError: any) {


        await incrementNotificationAttempt(
          notification.id,
          notification.attempts
        );


        await markNotificationFailed(
          notification.id,
          smsError.message || 'Unknown SMS error'
        );


        failed++;

      }

    }



    return NextResponse.json({

      success: true,

      message:
        'Notification processing completed',

      processed:
        notifications.length,

      sent,

      failed,

    });



  } catch (error: any) {


    console.error(
      'Notification API Error:',
      error
    );


    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'Server error',
      },
      {
        status: 500,
      }
    );

  }

}