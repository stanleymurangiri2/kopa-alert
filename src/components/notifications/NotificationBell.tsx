'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';



type NotificationSummary = {
  pending: number;
  sent: number;
  failed: number;
};



export default function NotificationBell() {

  const [summary, setSummary] =
    useState<NotificationSummary>({
      pending: 0,
      sent: 0,
      failed: 0,
    });


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
        .select('status');


      if (error) {
        console.error(error);
        return;
      }



      const result = {
        pending: 0,
        sent: 0,
        failed: 0,
      };



      data?.forEach((item) => {

        if (item.status === 'pending') {
          result.pending++;
        }


        if (item.status === 'sent') {
          result.sent++;
        }


        if (item.status === 'failed') {
          result.failed++;
        }

      });



      setSummary(result);


    } catch (error) {

      console.error(
        'Notification loading error:',
        error
      );


    } finally {

      setLoading(false);

    }

  }



  if (loading) {

    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
    );

  }



  const total =
    summary.pending +
    summary.failed;



  return (

    <Link
      href="/notifications"
      className="relative flex items-center rounded-full p-2 hover:bg-gray-100"
    >

      {/* Bell Icon */}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="h-6 w-6 text-gray-700"
      >

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 10-12 0v.75c0 2.31-.874 4.42-2.311 6.022a23.848 23.848 0 005.454 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />

      </svg>



      {total > 0 && (

        <span className="
          absolute
          -right-1
          -top-1
          flex
          h-5
          min-w-5
          items-center
          justify-center
          rounded-full
          bg-red-600
          px-1
          text-xs
          font-bold
          text-white
        ">

          {total}

        </span>

      )}


    </Link>

  );

}