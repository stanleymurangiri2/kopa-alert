import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/utils/verify-cron-secret';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
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