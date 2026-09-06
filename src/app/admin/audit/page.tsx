"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

const PAGE_SIZE = 15;

function actionBadgeStyle(action: string) {
  const a = action.toUpperCase();

  if (a.includes("DELETE") || a.includes("REJECT") || a.includes("SUSPEND")) {
    return "bg-destructive/10 text-destructive";
  }

  if (a.includes("APPROVE") || a.includes("ACTIVATE")) {
    return "bg-success/10 text-success";
  }

  if (a.includes("RESEND")) {
    return "bg-warning/10 text-warning";
  }

  return "bg-info/10 text-info";
}

function getAdminName(log: AuditLog) {
  return Array.isArray(log.users) ? log.users[0]?.name : log.users?.name;
}

export default function AuditLogsPage() {
  const supabase = createClient();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        `
        id,
        action,
        target_type,
        description,
        created_at,
        users(name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLogs([]);
    } else {
      setLogs((data ?? []) as unknown as AuditLog[]);
    }

    setLoading(false);
  }

  const actionTypes = useMemo(() => {
    return [...new Set(logs.map((log) => log.action))].sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let rows = logs;

    if (actionFilter !== "all") {
      rows = rows.filter((log) => log.action === actionFilter);
    }

    if (startDate) {
      rows = rows.filter((log) => log.created_at >= startDate);
    }

    if (endDate) {
      const endOfDay = new Date(`${endDate}T00:00:00`);
      endOfDay.setDate(endOfDay.getDate() + 1);
      rows = rows.filter((log) => log.created_at < endOfDay.toISOString());
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter((log) => {
        const adminName = getAdminName(log) ?? "";
        return (
          adminName.toLowerCase().includes(query) ||
          (log.description ?? "").toLowerCase().includes(query) ||
          (log.target_type ?? "").toLowerCase().includes(query)
        );
      });
    }

    return rows;
  }, [logs, search, actionFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  if (loading) {
    return <main className="p-8 text-muted-foreground">Loading audit logs...</main>;
  }

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>

        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
          <h2 className="font-semibold text-destructive">Failed to load audit logs</h2>
          <p className="mt-2 text-sm text-destructive">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">Platform activity history.</p>
        </div>

        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => updateFilter(setSearch, e.target.value)}
            placeholder="Search admin, target, or description..."
            className="w-72 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => updateFilter(setActionFilter, e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="all">All actions</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => updateFilter(setStartDate, e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => updateFilter(setEndDate, e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl bg-card border border-border shadow">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-medium text-foreground">No audit logs found.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {logs.length === 0
                ? "Platform activity will appear here when administrative actions are performed."
                : "Try adjusting your search or filters."}
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
              {paginatedLogs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? "bg-table-stripe" : "bg-card"}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-foreground">{getAdminName(log) ?? "-"}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${actionBadgeStyle(log.action)}`}
                    >
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredLogs.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
