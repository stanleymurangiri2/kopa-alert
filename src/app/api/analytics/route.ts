import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        {
          status: 401,
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business not found.',
        },
        {
          status: 404,
        }
      );
    }

    const businessId = profile.business_id;

    const [
      customers,
      debts,
      overdue,
      payments,
      sent,
      pending,
      failed,
    ] = await Promise.all([
      supabase
        .from('customers')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('business_id', businessId),

      supabase
        .from('debts')
        .select('amount, amount_paid', {
          count: 'exact',
        })
        .eq('business_id', businessId),

      supabase
        .from('debts')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('business_id', businessId)
        .eq('status', 'overdue'),

      supabase
  .from('payments')
  .select('amount_paid')
  .eq('business_id', businessId),

      supabase
        .from('notification_queue')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('business_id', businessId)
        .eq('status', 'sent'),

      supabase
        .from('notification_queue')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('business_id', businessId)
        .eq('status', 'pending'),

      supabase
        .from('notification_queue')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('business_id', businessId)
        .eq('status', 'failed'),
    ]);

    let outstandingBalance = 0;
    let totalDebt = 0;

    debts.data?.forEach((debt) => {
      const amount = Number(debt.amount ?? 0);
      const paid = Number(debt.amount_paid ?? 0);

      totalDebt += amount;
      outstandingBalance += amount - paid;
    });

    let totalCollected = 0;

    payments.data?.forEach((payment) => {
      totalCollected += Number(payment.amount_paid ?? 0);
    });

    return NextResponse.json({
      success: true,
      analytics: {
        customers: customers.count ?? 0,
        debts: debts.count ?? 0,
        overdueDebts: overdue.count ?? 0,
        totalDebt,
        outstandingBalance,
        totalCollected,
        smsSent: sent.count ?? 0,
        smsPending: pending.count ?? 0,
        smsFailed: failed.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Analytics API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}