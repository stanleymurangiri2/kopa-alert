import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResendActions from "./requests/[id]/ResendActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: pending },
    { count: approved },
    { count: rejected },
    { count: businesses },
    { count: users },
  ] = await Promise.all([
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

  const { data: requests } = await supabase
    .from("business_requests")
    .select(`
      id,
      business_name,
      owner_name,
      email,
      phone,
      created_at
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: approvedRequests } = await supabase
    .from("business_requests")
    .select(`
      id,
      business_name,
      owner_name,
      email,
      approved_at,
      resend_count
    `)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(5);

  return (
    <main className="p-8">

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Super Admin Dashboard
        </h1>

        <p className="mt-2 text-muted-foreground">
          Overview of the KopaAlert platform.
        </p>
      </div>

      {/* Statistics */}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">

        <StatCard
          title="Pending Requests"
          value={pending ?? 0}
          color="bg-warning"
        />

        <StatCard
          title="Approved Requests"
          value={approved ?? 0}
          color="bg-success"
        />

        <StatCard
          title="Rejected Requests"
          value={rejected ?? 0}
          color="bg-destructive"
        />

        <StatCard
          title="Registered Businesses"
          value={businesses ?? 0}
          color="bg-primary"
        />

        <StatCard
          title="Platform Users"
          value={users ?? 0}
          color="bg-employee"
        />

      </div>

      {/* Recent Pending Registrations */}

      <div className="mt-10 rounded-xl bg-card border border-border shadow">

        <div className="flex items-center justify-between border-b border-border p-6">

          <h2 className="text-xl font-semibold text-foreground">
            Recent Pending Registrations
          </h2>

          <Link
            href="/admin/requests"
            className="text-primary hover:underline"
          >
            View All
          </Link>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="bg-primary">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Business
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Owner
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Email
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Phone
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Date
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {requests && requests.length > 0 ? (

                requests.map((request, i) => (

                  <tr
                    key={request.id}
                    className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                  >

                    <td className="px-6 py-4 text-[15px] font-semibold text-foreground">
                      {request.business_name}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {request.owner_name}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {request.email}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {request.phone}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(
                        request.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4">

                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="text-primary hover:underline"
                      >
                        Review
                      </Link>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No pending registrations.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* Recently Approved Requests */}

      <div className="mt-10 rounded-xl bg-card border border-border shadow">

        <div className="flex items-center justify-between border-b border-border p-6">

          <h2 className="text-xl font-semibold text-foreground">
            Recently Approved Requests
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="bg-primary">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Business
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Owner
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Email
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Approved
                </th>

                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {approvedRequests && approvedRequests.length > 0 ? (

                approvedRequests.map((request, i) => (

                  <tr
                    key={request.id}
                    className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                  >

                    <td className="px-6 py-4 text-[15px] font-semibold text-foreground">
                      {request.business_name}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {request.owner_name}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {request.email}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {request.approved_at
                        ? new Date(
                            request.approved_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="px-6 py-4">

                      <ResendActions
                        requestId={request.id}
                        resendCount={request.resend_count ?? 0}
                      />

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No approved requests yet.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </main>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card border border-border shadow">

      <div className={`${color} h-2`} />

      <div className="p-6">

        <p className="text-muted-foreground">
          {title}
        </p>

        <h2 className="mt-3 font-mono text-4xl font-bold text-foreground">
          {value}
        </h2>

      </div>

    </div>
  );
}
