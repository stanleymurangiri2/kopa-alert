import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("users")
    .select(
      `
      id,
      name,
      email,
      role,
      business_id
    `,
    )
    .order("name");

  if (error) {
    console.error("Admin users query failed:", error);

    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">User Management</h1>

        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load users. Please refresh the page and try again.
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>

          <p className="mt-2 text-gray-500">
            Manage every platform user.
          </p>
        </div>

        <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
          {users?.length ?? 0} user
          {(users?.length ?? 0) === 1 ? "" : "s"}
        </div>
      </div>

      <div className="my-6">
        <input
          type="search"
          placeholder="Search users..."
          disabled
          className="w-full cursor-not-allowed rounded-lg border bg-gray-50 px-4 py-3 text-gray-500"
          title="Search will be enabled in the next admin enhancement."
        />
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>

              <th className="px-6 py-4 text-left">Email</th>

              <th className="px-6 py-4 text-left">Role</th>

              <th className="px-6 py-4 text-left">Business ID</th>

              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users && users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-6 py-4 font-medium">
                    {user.name || "-"}
                  </td>

                  <td className="px-6 py-4">
                    {user.email || "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                      {user.role || "-"}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs">
                    {user.business_id ?? "-"}
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
