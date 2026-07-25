// Location: app/api/analytics/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const range = searchParams.get('range') || '30d';

  // Calculate start/end dates based on selected range
  const endDate = new Date();
  const startDate = new Date();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  startDate.setDate(endDate.getDate() - days);

  /* 
    Example Supabase query calling the RPC function defined earlier:
    
    const { data, error } = await supabase.rpc('get_tenant_daily_metrics', {
      p_tenant_id: tenantId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });
  */

  // Mock response structure expected by the frontend component
  const mockData = Array.from({ length: days }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    return {
      metric_date: d.toISOString().split('T')[0],
      total_events: Math.floor(Math.random() * 50) + 10,
      total_value: Math.floor(Math.random() * 500) + 100,
    };
  });

  return NextResponse.json({ data: mockData });
}