import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  description: string | null;
  created_at: string;
  users:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
}

export default async function AuditLogsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      target_type,
      description,
      created_at,
      users(name)
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">Audit Logs</h1>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Failed to load audit logs
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  const logs = (data ?? []) as AuditLog[];

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Audit Logs
          </h1>

          <p className="text-gray-500 mt-2">
            Platform activity history.
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {logs.length} {logs.length === 1 ? "log" : "logs"}
        </span>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow">
        {logs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-medium text-gray-700">
              No audit logs yet.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Platform activity will appear here when administrative
              actions are performed.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">
                  Date
                </th>

                <th className="px-6 py-4 text-left">
                  Admin
                </th>

                <th className="px-6 py-4 text-left">
                  Action
                </th>

                <th className="px-6 py-4 text-left">
                  Target
                </th>

                <th className="px-6 py-4 text-left">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => {
                const adminName = Array.isArray(log.users)
                  ? log.users[0]?.name
                  : log.users?.name;

                return (
                  <tr
                    key={log.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(
                        log.created_at
                      ).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      {adminName ?? "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {log.target_type ?? "-"}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.description ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
