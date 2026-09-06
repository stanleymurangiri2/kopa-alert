import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUSINESS_STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning",
  approved: "bg-success",
  suspended: "bg-destructive",
  rejected: "bg-blacklist",
};

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-employee",
  business_admin: "bg-primary",
  employee: "bg-info",
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default async function ReportsPage() {
  const supabase = await createClient();

  const [requestsResult, businessesResult, usersResult] = await Promise.all([
    supabase.from("business_requests").select("id, status, created_at"),
    supabase.from("businesses").select("id, status, subscription_tier"),
    supabase.from("users").select("id, role"),
  ]);

  const error = requestsResult.error ?? businessesResult.error ?? usersResult.error;

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>

        <p className="mt-2 text-muted-foreground">Platform summary and analytics.</p>

        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
          <h2 className="font-semibold text-destructive">Failed to load reports</h2>

          <p className="mt-2 text-sm text-destructive">
            {error.message ?? "An unexpected database error occurred."}
          </p>
        </div>
      </main>
    );
  }

  const requests = requestsResult.data ?? [];
  const businesses = businessesResult.data ?? [];
  const users = usersResult.data ?? [];

  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const approvedRequests = requests.filter((r) => r.status === "approved").length;
  const rejectedRequests = requests.filter((r) => r.status === "rejected").length;

  const businessesByStatus: Record<string, number> = {};
  const businessesByTier: Record<string, number> = {};
  for (const business of businesses) {
    const status = business.status ?? "unknown";
    businessesByStatus[status] = (businessesByStatus[status] ?? 0) + 1;

    const tier = business.subscription_tier ?? "none";
    businessesByTier[tier] = (businessesByTier[tier] ?? 0) + 1;
  }

  const usersByRole: Record<string, number> = {};
  for (const user of users) {
    const role = user.role ?? "unknown";
    usersByRole[role] = (usersByRole[role] ?? 0) + 1;
  }

  const today = startOfDay(new Date());
  const dailyCounts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyCounts.set(dateKey(d), 0);
  }

  for (const request of requests) {
    const key = dateKey(startOfDay(new Date(request.created_at)));
    if (dailyCounts.has(key)) {
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    }
  }

  const trend = [...dailyCounts.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  const last30DaysTotal = trend.reduce((sum, [, count]) => sum + count, 0);

  return (
    <main className="p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="mt-2 text-muted-foreground">Platform summary and analytics.</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Registration Pipeline</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <ReportCard title="Total Requests" value={totalRequests} />
          <ReportCard title="Pending" value={pendingRequests} tone="warning" />
          <ReportCard title="Approved" value={approvedRequests} tone="success" />
          <ReportCard title="Rejected" value={rejectedRequests} tone="destructive" />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Platform Totals</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <ReportCard title="Registered Businesses" value={businesses.length} />
          <ReportCard title="Platform Users" value={users.length} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownCard
          title="Businesses by Status"
          total={businesses.length}
          styles={BUSINESS_STATUS_STYLES}
          counts={businessesByStatus}
        />

        <BreakdownCard
          title="Businesses by Subscription Tier"
          total={businesses.length}
          styles={{}}
          counts={businessesByTier}
        />

        <BreakdownCard
          title="Users by Role"
          total={users.length}
          styles={ROLE_STYLES}
          counts={usersByRole}
        />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-foreground">
          New Registration Requests (Last 30 Days)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {last30DaysTotal} request{last30DaysTotal === 1 ? "" : "s"} submitted in this window.
        </p>

        <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow">
          <table className="w-full">
            <thead className="sticky top-0 bg-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Requests
                </th>
              </tr>
            </thead>
            <tbody>
              {trend.map(([day, count], i) => (
                <tr
                  key={day}
                  className={`border-t border-border ${i % 2 === 1 ? "bg-table-stripe" : "bg-card"}`}
                >
                  <td className="px-6 py-2 text-sm text-muted-foreground">
                    {parseDateKey(day).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td
                    className={`px-6 py-2 text-right font-mono ${
                      count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function ReportCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone?: "warning" | "success" | "destructive";
}) {
  const toneClasses: Record<string, string> = {
    warning: "text-warning",
    success: "text-success",
    destructive: "text-destructive",
  };
  const toneClass = tone ? toneClasses[tone] : "text-primary";

  return (
    <div className="rounded-xl bg-card border border-border p-6 shadow">
      <h3 className="text-muted-foreground">{title}</h3>
      <p className={`mt-4 font-mono text-4xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function BreakdownCard({
  title,
  total,
  counts,
  styles,
}: {
  title: string;
  total: number;
  counts: Record<string, number>;
  styles: Record<string, string>;
}) {
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);

  return (
    <div className="rounded-xl bg-card border border-border p-6 shadow">
      <h3 className="mb-4 font-semibold text-foreground">{title}</h3>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-foreground">{label.replace(/_/g, " ")}</span>
                  <span className="font-mono text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${styles[label] ?? "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
