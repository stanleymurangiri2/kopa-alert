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
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>

        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
          <h2 className="font-semibold text-destructive">
            Failed to load audit logs
          </h2>

          <p className="mt-2 text-sm text-destructive">
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
          <h1 className="text-3xl font-bold text-foreground">
            Audit Logs
          </h1>

          <p className="text-muted-foreground mt-2">
            Platform activity history.
          </p>
        </div>

        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          {logs.length} {logs.length === 1 ? "log" : "logs"}
        </span>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl bg-card border border-border shadow">
        {logs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-medium text-foreground">
              No audit logs yet.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              Platform activity will appear here when administrative
              actions are performed.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-primary">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Date
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Admin
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Action
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Target
                </th>

                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Description
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log, i) => {
                const adminName = Array.isArray(log.users)
                  ? log.users[0]?.name
                  : log.users?.name;

                return (
                  <tr
                    key={log.id}
                    className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(
                        log.created_at
                      ).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-foreground">
                      {adminName ?? "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {log.target_type ?? "-"}
                    </td>

                    <td className="px-6 py-4 text-sm text-muted-foreground">
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
