import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { count: totalRequests },
    { count: pending },
    { count: approved },
    { count: rejected },
    { count: totalBusinesses },
    { count: totalUsers },
  ] = await Promise.all([
    supabase
      .from("business_requests")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("business_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("business_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("business_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected"),

    supabase
      .from("businesses")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("users")
      .select("*", { count: "exact", head: true }),
  ]);

  return (
    <main className="p-8">

      <h1 className="text-3xl font-bold">
        Reports
      </h1>

      <p className="mt-2 text-gray-500">
        Platform summary and analytics.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        <ReportCard
          title="Total Registration Requests"
          value={totalRequests ?? 0}
        />

        <ReportCard
          title="Pending Requests"
          value={pending ?? 0}
        />

        <ReportCard
          title="Approved Requests"
          value={approved ?? 0}
        />

        <ReportCard
          title="Rejected Requests"
          value={rejected ?? 0}
        />

        <ReportCard
          title="Registered Businesses"
          value={totalBusinesses ?? 0}
        />

        <ReportCard
          title="Platform Users"
          value={totalUsers ?? 0}
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
    <div className="rounded-xl bg-white p-6 shadow">

      <h2 className="text-gray-500">
        {title}
      </h2>

      <p className="mt-4 text-4xl font-bold text-blue-600">
        {value}
      </p>

    </div>
  );
}