import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/utils/verify-cron-secret';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('auto_blacklist_overdue_customers');

    if (error) throw error;

    const blacklisted = (data ?? []) as {
      out_customer_id: string;
      out_business_id: string;
      out_full_name: string;
    }[];

    for (const row of blacklisted) {
      try {
        await supabase.from('audit_logs').insert({
          business_id: row.out_business_id,
          action: 'AUTO_BLACKLIST',
          target_type: 'customer',
          description: `${row.out_full_name} was automatically blacklisted after a debt went 10+ days overdue.`,
        });
      } catch {
        // best-effort audit log; the blacklist itself already succeeded
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-blacklist sweep complete.',
      blacklisted: blacklisted.length,
    });
  } catch (error: any) {
    console.error('Auto-Blacklist Cron Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
