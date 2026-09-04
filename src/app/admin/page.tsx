import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResendActions from "./requests/[id]/ResendActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  //----------------------------------------------------
  // Dashboard Statistics
  //----------------------------------------------------

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

  //----------------------------------------------------
  // Recent Pending Registrations
  //----------------------------------------------------

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

  //----------------------------------------------------
  // Recently Approved Businesses
  //----------------------------------------------------

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
        <h1 className="text-3xl font-bold">
          Super Admin Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Overview of the KopaAlert platform.
        </p>
      </div>

      {/* Statistics */}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Pending"
          value={pending ?? 0}
          color="bg-yellow-500"
        />

        <StatCard
          title="Approved"
          value={approved ?? 0}
          color="bg-green-600"
        />

        <StatCard
          title="Rejected"
          value={rejected ?? 0}
          color="bg-red-600"
        />

        <StatCard
          title="Businesses"
          value={businesses ?? 0}
          color="bg-blue-600"
        />

        <StatCard
          title="Users"
          value={users ?? 0}
          color="bg-purple-600"
        />
      </div>

      {/* Recent Pending Registrations */}

      <div className="mt-10 rounded-xl bg-white shadow">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">
            Recent Pending Registrations
          </h2>

          <Link
            href="/admin/requests"
            className="text-blue-600 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  Business
                </th>

                <th className="px-6 py-3 text-left">
                  Owner
                </th>

                <th className="px-6 py-3 text-left">
                  Email
                </th>

                <th className="px-6 py-3 text-left">
                  Phone
                </th>

                <th className="px-6 py-3 text-left">
                  Date
                </th>

                <th className="px-6 py-3 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {requests && requests.length > 0 ? (
                requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t"
                  >
                    <td className="px-6 py-4">
                      {request.business_name}
                    </td>

                    <td className="px-6 py-4">
                      {request.owner_name}
                    </td>

                    <td className="px-6 py-4">
                      {request.email}
                    </td>

                    <td className="px-6 py-4">
                      {request.phone}
                    </td>

                    <td className="px-6 py-4">
                      {new Date(
                        request.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="text-blue-600 hover:underline"
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
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No pending registrations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recently Approved Businesses */}

      <div className="mt-10 rounded-xl bg-white shadow">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">
            Recently Approved Businesses
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  Business
                </th>

                <th className="px-6 py-3 text-left">
                  Owner
                </th>

                <th className="px-6 py-3 text-left">
                  Email
                </th>

                <th className="px-6 py-3 text-left">
                  Approved
                </th>

                <th className="px-6 py-3 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {approvedRequests && approvedRequests.length > 0 ? (
                approvedRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t"
                  >
                    <td className="px-6 py-4">
                      {request.business_name}
                    </td>

                    <td className="px-6 py-4">
                      {request.owner_name}
                    </td>

                    <td className="px-6 py-4">
                      {request.email}
                    </td>

                    <td className="px-6 py-4">
                      {request.approved_at
                        ? new Date(request.approved_at).toLocaleDateString()
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
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No approved businesses yet.
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
    <div className="overflow-hidden rounded-xl bg-white shadow">
      <div className={`${color} h-2`} />

      <div className="p-6">
        <p className="text-gray-500">
          {title}
        </p>

        <h2 className="mt-3 text-4xl font-bold">
          {value}
        </h2>
      </div>
    </div>
  );
}
