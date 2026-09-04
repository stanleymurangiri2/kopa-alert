import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
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
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">
        Audit Logs
      </h1>
      <p className="text-gray-500 mt-2">
        Platform activity history.
      </p>
      <div className="mt-8 overflow-x-auto rounded-xl bg-white shadow">
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
            {logs?.map((log: any) => (
              <tr
                key={log.id}
                className="border-t"
              >
                <td className="px-6 py-4">
                  {new Date(
                    log.created_at
                  ).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {log.users?.name ?? "-"}
                </td>
                <td className="px-6 py-4 font-semibold">
                  {log.action}
                </td>
                <td className="px-6 py-4">
                  {log.target_type}
                </td>
                <td className="px-6 py-4">
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
