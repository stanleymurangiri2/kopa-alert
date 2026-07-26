'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';


type Notification = {
  id: string;
  recipient_phone: string;
  message_body: string;
  channel: string;
  status: string;
  attempts: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};



export default function NotificationsPage() {

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] =
    useState(true);



  useEffect(() => {

    loadNotifications();

  }, []);



  async function loadNotifications() {

    try {

      const supabase = createClient();


      const {
        data,
        error,
      } = await supabase
        .from('notification_queue')
        .select(`
          id,
          recipient_phone,
          message_body,
          channel,
          status,
          attempts,
          error_message,
          sent_at,
          created_at
        `)
        .order(
          'created_at',
          {
            ascending: false,
          }
        );



      if (error) {

        console.error(error);

        return;

      }



      setNotifications(
        data || []
      );


    } finally {

      setLoading(false);

    }

  }



  function statusStyle(status: string) {

    switch (status) {

      case 'sent':

        return 'bg-green-100 text-green-700';


      case 'failed':

        return 'bg-red-100 text-red-700';


      case 'pending':

        return 'bg-yellow-100 text-yellow-700';


      default:

        return 'bg-gray-100 text-gray-700';

    }

  }



  if (loading) {

    return (

      <div className="p-6">

        Loading notifications...

      </div>

    );

  }



  return (

    <div className="p-6">


      <div className="mb-6">

        <h1 className="text-2xl font-bold text-gray-900">
          Notifications
        </h1>

        <p className="text-sm text-gray-500">
          Monitor SMS reminders and delivery status
        </p>

      </div>



      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">

        <table className="w-full text-sm">


          <thead className="border-b bg-gray-50">

            <tr>

              <th className="px-4 py-3 text-left">
                Recipient
              </th>


              <th className="px-4 py-3 text-left">
                Message
              </th>


              <th className="px-4 py-3 text-left">
                Channel
              </th>


              <th className="px-4 py-3 text-left">
                Status
              </th>


              <th className="px-4 py-3 text-left">
                Attempts
              </th>


              <th className="px-4 py-3 text-left">
                Date
              </th>


            </tr>

          </thead>



          <tbody>


            {notifications.length === 0 && (

              <tr>

                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >

                  No notifications found.

                </td>

              </tr>

            )}



            {notifications.map((notification) => (

              <tr
                key={notification.id}
                className="border-b last:border-none"
              >

                <td className="px-4 py-3">

                  {notification.recipient_phone}

                </td>



                <td className="max-w-md px-4 py-3">

                  <p className="truncate">

                    {notification.message_body}

                  </p>


                  {notification.error_message && (

                    <p className="mt-1 text-xs text-red-600">

                      {notification.error_message}

                    </p>

                  )}

                </td>



                <td className="px-4 py-3 uppercase">

                  {notification.channel}

                </td>



                <td className="px-4 py-3">

                  <span
                    className={`
                      rounded-full
                      px-3
                      py-1
                      text-xs
                      font-medium
                      ${statusStyle(notification.status)}
                    `}
                  >

                    {notification.status}

                  </span>

                </td>



                <td className="px-4 py-3">

                  {notification.attempts}

                </td>



                <td className="px-4 py-3 text-gray-500">

                  {new Date(
                    notification.created_at
                  ).toLocaleDateString()}

                </td>


              </tr>

            ))}


          </tbody>


        </table>

      </div>


    </div>

  );

}