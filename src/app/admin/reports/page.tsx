import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  const results = await Promise.all([
    supabase
      .from("business_requests")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("business_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("business_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("business_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),

    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("users")
      .select("id", { count: "exact", head: true }),
  ]);

  const errors = results
    .map((result) => result.error)
    .filter(Boolean);

  if (errors.length > 0) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold text-foreground">
          Reports
        </h1>

        <p className="mt-2 text-muted-foreground">
          Platform summary and analytics.
        </p>

        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
          <h2 className="font-semibold text-destructive">
            Failed to load reports
          </h2>

          <p className="mt-2 text-sm text-destructive">
            {errors[0]?.message ?? "An unexpected database error occurred."}
          </p>
        </div>
      </main>
    );
  }

  const [
    totalRequestsResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    totalBusinessesResult,
    totalUsersResult,
  ] = results;

  const totalRequests = totalRequestsResult.count ?? 0;
  const pending = pendingResult.count ?? 0;
  const approved = approvedResult.count ?? 0;
  const rejected = rejectedResult.count ?? 0;
  const totalBusinesses = totalBusinessesResult.count ?? 0;
  const totalUsers = totalUsersResult.count ?? 0;

  return (
    <main className="p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Reports
        </h1>

        <p className="mt-2 text-muted-foreground">
          Platform summary and analytics.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          title="Total Registration Requests"
          value={totalRequests}
        />

        <ReportCard
          title="Pending Requests"
          value={pending}
        />

        <ReportCard
          title="Approved Requests"
          value={approved}
        />

        <ReportCard
          title="Rejected Requests"
          value={rejected}
        />

        <ReportCard
          title="Registered Businesses"
          value={totalBusinesses}
        />

        <ReportCard
          title="Platform Users"
          value={totalUsers}
        />
      </div>
    </main>
  );
}

function ReportCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-6 shadow">
      <h2 className="text-muted-foreground">
        {title}
      </h2>

      <p className="mt-4 font-mono text-4xl font-bold text-primary">
        {value}
      </p>
    </div>
  );
}
