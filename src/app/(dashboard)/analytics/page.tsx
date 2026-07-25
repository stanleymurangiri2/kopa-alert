// Location: app/(dashboard)/analytics/page.tsx
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default async function AnalyticsPage() {
  // Fetch active session or tenant context from server cookies/headers
  const tenantId = "tenant-uuid-123"; 

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Overview</h1>
      <AnalyticsDashboard tenantId={tenantId} />
    </main>
  );
}