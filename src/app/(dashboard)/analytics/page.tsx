'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Analytics = {
  customers: number;
  debts: number;
  outstanding: number;
  collected: number;
  overdue: number;
  smsSent: number;
  smsPending: number;
  smsFailed: number;
};

export default function AnalyticsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Analytics>({
    customers: 0,
    debts: 0,
    outstanding: 0,
    collected: 0,
    overdue: 0,
    smsSent: 0,
    smsPending: 0,
    smsFailed: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        setLoading(false);
        return;
      }

      const businessId = profile.business_id;

      const [
        customersResult,
        debtsResult,
        overdueResult,
        sentResult,
        pendingResult,
        failedResult,
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId),

        supabase
          .from('debts')
          .select('amount, amount_paid', { count: 'exact' })
          .eq('business_id', businessId),

        supabase
          .from('debts')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'overdue'),

        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'sent'),

        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'pending'),

        supabase
          .from('notification_queue')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'failed'),
      ]);

      let outstanding = 0;
      let collected = 0;

      debtsResult.data?.forEach((debt) => {
        collected += Number(debt.amount_paid ?? 0);
        outstanding +=
          Number(debt.amount ?? 0) -
          Number(debt.amount_paid ?? 0);
      });

      setStats({
        customers: customersResult.count ?? 0,
        debts: debtsResult.count ?? 0,
        outstanding,
        collected,
        overdue: overdueResult.count ?? 0,
        smsSent: sentResult.count ?? 0,
        smsPending: pendingResult.count ?? 0,
        smsFailed: failedResult.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      title: 'Customers',
      value: stats.customers,
    },
    {
      title: 'Debts',
      value: stats.debts,
    },
    {
      title: 'Outstanding Balance',
      value: `KES ${stats.outstanding.toLocaleString()}`,
    },
    {
      title: 'Collected',
      value: `KES ${stats.collected.toLocaleString()}`,
    },
    {
      title: 'Overdue Debts',
      value: stats.overdue,
    },
    {
      title: 'SMS Sent',
      value: stats.smsSent,
    },
    {
      title: 'SMS Pending',
      value: stats.smsPending,
    },
    {
      title: 'SMS Failed',
      value: stats.smsFailed,
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Analytics Dashboard
        </h1>

        <p className="text-gray-500">
          Business performance overview
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg border bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm text-gray-500">
              {card.title}
            </h2>

            <p className="mt-3 text-3xl font-bold">
              {card.value}
            </p>
          </div>
        ))}

      </div>

    </div>
  );
}