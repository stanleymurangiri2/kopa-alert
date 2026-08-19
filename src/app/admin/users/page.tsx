import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
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

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>

          <p className="text-gray-500 mt-2">Manage every platform user.</p>
        </div>
      </div>

      {/* Search */}

      <div className="my-6">
        <input
          placeholder="Search users..."
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>

              <th className="px-6 py-4 text-left">Email</th>

              <th className="px-6 py-4 text-left">Role</th>

              <th className="px-6 py-4 text-left">Business</th>

              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users?.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-6 py-4 font-medium">{user.name}</td>

                <td className="px-6 py-4">{user.email}</td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                    {user.role}
                  </span>
                </td>

                <td className="px-6 py-4">{user.business_id ?? "-"}</td>

                <td className="px-6 py-4">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

