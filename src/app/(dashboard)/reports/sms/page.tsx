"use client";

import { useEffect, useMemo, useState } from "react";

interface SmsReport {
  id: string;
  customer_name: string | null;
  phone: string;
  message: string;
  channel: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface SmsTrend {
  date: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
}

interface SmsSummary {
  totalMessages: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
  deliveryRate: number;
}

interface ApiResponse {
  success: boolean;
  summary: SmsSummary;
  trends: SmsTrend[];
  messages: SmsReport[];
  message?: string;
}

const PAGE_SIZE = 10;

export default function SmsReportsPage() {
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] =
    useState<SmsSummary | null>(null);

  const [messages, setMessages] =
    useState<SmsReport[]>([]);

  const [trends, setTrends] =
    useState<SmsTrend[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [page, setPage] = useState(1);

  const [error, setError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");
    setPage(1);

    try {
      const params = new URLSearchParams();

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(
        `/api/reports/sms?${params.toString()}`
      );

      const data: ApiResponse =
        await response.json();

      if (data.success) {
        setSummary(data.summary);
        setMessages(data.messages);
        setTrends(data.trends);
      } else {
        setError(data.message || "Failed to load SMS reports.");
      }
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const matchesSearch =
        (message.customer_name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        message.phone.includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        message.status === statusFilter;

      return (
        matchesSearch && matchesStatus
      );
    });
  }, [
    messages,
    search,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredMessages.length /
        PAGE_SIZE
    )
  );

  const paginatedMessages =
    filteredMessages.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE
    );

  function statusBadge(
    status: string
  ) {
    switch (status) {
      case "sent":
        return "bg-success/10 text-success";

      case "failed":
        return "bg-destructive/10 text-destructive";

      case "pending":
        return "bg-warning/10 text-warning";

      case "cancelled":
        return "bg-muted text-muted-foreground";

      default:
        return "bg-muted text-muted-foreground";
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading SMS reports...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-foreground">
            SMS Reports
          </h1>

          <p className="text-muted-foreground">
            Delivery statistics and
            notification history.
          </p>

        </div>

        <button
          onClick={loadReport}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Refresh
        </button>

      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {summary && (

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">

          <SummaryCard
            title="Messages"
            value={
              summary.totalMessages
            }
          />

          <SummaryCard
            title="Sent"
            value={
              summary.sent
            }
          />

          <SummaryCard
            title="Failed"
            value={
              summary.failed
            }
          />

          <SummaryCard
            title="Pending"
            value={
              summary.pending
            }
          />

          <SummaryCard
            title="Cancelled"
            value={
              summary.cancelled
            }
          />

          <SummaryCard
            title="Delivery Rate"
            value={`${summary.deliveryRate}%`}
          />

        </div>

      )}

      <div className="rounded-lg border border-border bg-card p-5">

        <div className="grid gap-4 md:grid-cols-4">

          <input
            className="rounded-md border border-border bg-card p-2 text-foreground"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(
                e.target.value
              );
              setPage(1);
            }}
          />

          <select
            className="rounded-md border border-border bg-card p-2 text-foreground"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(
                e.target.value
              );
              setPage(1);
            }}
          >
            <option value="all">
              All Status
            </option>

            <option value="sent">
              Sent
            </option>

            <option value="failed">
              Failed
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="cancelled">
              Cancelled
            </option>

          </select>

          <input
            type="date"
            className="rounded-md border border-border bg-card p-2 text-foreground"
            value={startDate}
            onChange={(e) =>
              setStartDate(
                e.target.value
              )
            }
          />

          <input
            type="date"
            className="rounded-md border border-border bg-card p-2 text-foreground"
            value={endDate}
            onChange={(e) =>
              setEndDate(
                e.target.value
              )
            }
          />

        </div>

        <button
          onClick={loadReport}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Apply Filters
        </button>

      </div>

      <div className="rounded-lg border border-border bg-card p-5">

        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Daily SMS Trends
        </h2>

        <div className="space-y-3">

          {trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            trends.map((trend) => (

              <div
                key={trend.date}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-border p-3"
              >

                <span className="text-foreground">
                  {trend.date}
                </span>

                <div className="flex flex-wrap gap-4 text-sm">

                  <span className="text-muted-foreground">
                    Total:
                    {" "}
                    {trend.total}
                  </span>

                  <span className="text-success">
                    Sent:
                    {" "}
                    {trend.sent}
                  </span>

                  <span className="text-destructive">
                    Failed:
                    {" "}
                    {trend.failed}
                  </span>

                  <span className="text-warning">
                    Pending:
                    {" "}
                    {trend.pending}
                  </span>

                  <span className="text-muted-foreground">
                    Cancelled:
                    {" "}
                    {trend.cancelled}
                  </span>

                </div>

              </div>

            ))
          )}

        </div>

      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">

        <table className="min-w-full">

          <thead className="bg-primary">

            <tr>

              <th className="sticky left-0 z-20 bg-primary px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Customer
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Phone
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Channel
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Sent
              </th>

            </tr>

          </thead>

          <tbody>

            {paginatedMessages.length ===
            0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No SMS records found.
                </td>

              </tr>

            ) : (

              paginatedMessages.map(
                (sms, i) => (

                  <tr
                    key={sms.id}
                    className={`group border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                  >

                    <td className={`sticky left-0 z-10 px-4 py-3 group-hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}>

                      <div className="text-[15px] font-semibold text-foreground">
                        {sms.customer_name ??
                          "-"}
                      </div>

                    </td>

                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {sms.phone}
                    </td>

                    <td className="px-4 py-3 uppercase text-muted-foreground">
                      {sms.channel}
                    </td>

                    <td className="px-4 py-3">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(
                          sms.status
                        )}`}
                      >
                        {sms.status}
                      </span>

                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {sms.sent_at
                        ? new Date(
                            sms.sent_at
                          ).toLocaleString()
                        : "-"}
                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>

      <div className="flex items-center justify-between">

        <button
          disabled={page === 1}
          onClick={() =>
            setPage(
              (p) => p - 1
            )
          }
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-muted-foreground">
          Page {page} of{" "}
          {totalPages}
        </span>

        <button
          disabled={
            page === totalPages
          }
          onClick={() =>
            setPage(
              (p) => p + 1
            )
          }
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
        >
          Next
        </button>

      </div>

    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">

      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <h2 className="mt-2 font-mono text-2xl font-bold text-foreground">
        {value}
      </h2>

    </div>
  );
}
