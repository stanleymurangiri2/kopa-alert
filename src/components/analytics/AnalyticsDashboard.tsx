// Location: components/analytics/AnalyticsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricPoint {
  metric_date: string;
  total_events: number;
  total_value: number;
}

export default function AnalyticsDashboard({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const res = await fetch(`/api/analytics?tenantId=${tenantId}&range=${range}`);
      const json = await res.json();
      setData(json.data || []);
      setLoading(false);
    }
    fetchAnalytics();
  }, [tenantId, range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Performance Analytics</h2>
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                range === r
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading analytics...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="metric_date" tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip />
              <Area type="monotone" dataKey="total_value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}