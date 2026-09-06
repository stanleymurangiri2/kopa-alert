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
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>

        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          Failed to load users. Please refresh the page and try again.
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>

          <p className="mt-2 text-muted-foreground">
            Manage every platform user.
          </p>
        </div>

        <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
          {users?.length ?? 0} user
          {(users?.length ?? 0) === 1 ? "" : "s"}
        </div>
      </div>

      <div className="my-6">
        <input
          type="search"
          placeholder="Search users..."
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-4 py-3 text-muted-foreground"
          title="Search will be enabled in the next admin enhancement."
        />
      </div>

      <div className="overflow-x-auto rounded-xl bg-card border border-border shadow">
        <table className="w-full">
          <thead className="bg-primary">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Name</th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Email</th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Role</th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Business ID</th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users && users.length > 0 ? (
              users.map((user, i) => (
                <tr key={user.id} className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}>
                  <td className="px-6 py-4 text-[15px] font-semibold text-foreground">
                    {user.name || "-"}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {user.email || "-"}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-info/10 px-3 py-1 text-info">
                      {user.role || "-"}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {user.business_id ?? "-"}
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-primary hover:underline"
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
                  className="px-6 py-12 text-center text-muted-foreground"
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
