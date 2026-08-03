import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('calculate_customer_ratings');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Customer ratings recalculated.',
      updated: data,
    });
  } catch (error: any) {
    console.error('Ratings Cron Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}