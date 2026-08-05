"use client";

import { useEffect, useMemo, useState } from "react";

interface SmsReport {
  id: string;
  customer_name: string | null;
  phone: string;
  message: string;
  status: string;
  provider: string |null;
  provider_message_id: string | null;
  cost: number;
  sent_at: string | null;
  created_at: string;
}

interface SmsTrend {
  date: string;
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface SmsSummary {
  totalMessages: number;
  delivered: number;
  failed: number;
  pending: number;
  queued: number;
  deliveryRate: number;
  totalCost: number;
}

interface ApiResponse {
  success: boolean;
  summary: SmsSummary;
  trends: SmsTrend[];
  messages: SmsReport[];
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

  async function loadReport() {
    setLoading(true);

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
      }
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
      case "delivered":
      case "sent":
        return "bg-green-100 text-green-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "queued":
        return "bg-blue-100 text-blue-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading SMS reports...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            SMS Reports
          </h1>

          <p className="text-gray-500">
            Delivery statistics and
            notification history.
          </p>

        </div>

        <button
          onClick={loadReport}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Refresh
        </button>

      </div>

      {summary && (

        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">

          <SummaryCard
            title="Messages"
            value={
              summary.totalMessages
            }
          />

          <SummaryCard
            title="Delivered"
            value={
              summary.delivered
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
            title="Queued"
            value={
              summary.queued
            }
          />

          <SummaryCard
            title="Delivery Rate"
            value={`${summary.deliveryRate}%`}
          />

          <SummaryCard
            title="SMS Cost"
            value={`KES ${summary.totalCost.toLocaleString()}`}
          />

        </div>

      )}

      <div className="rounded-lg border bg-white p-5">

        <div className="grid gap-4 md:grid-cols-4">

          <input
            className="rounded border p-2"
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
            className="rounded border p-2"
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

            <option value="delivered">
              Delivered
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

            <option value="queued">
              Queued
            </option>

          </select>

          <input
            type="date"
            className="rounded border p-2"
            value={startDate}
            onChange={(e) =>
              setStartDate(
                e.target.value
              )
            }
          />

          <input
            type="date"
            className="rounded border p-2"
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
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-white"
        >
          Apply Filters
        </button>

      </div>

      <div className="rounded-lg border bg-white p-5">

        <h2 className="mb-4 text-lg font-semibold">
          Daily SMS Trends
        </h2>

        <div className="space-y-3">

          {trends.map((trend) => (

            <div
              key={trend.date}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded border p-3"
            >

              <span>
                {trend.date}
              </span>

              <div className="flex flex-wrap gap-4 text-sm">

                <span>
                  Total:
                  {" "}
                  {trend.total}
                </span>

                <span className="text-green-600">
                  Delivered:
                  {" "}
                  {trend.delivered}
                </span>

                <span className="text-red-600">
                  Failed:
                  {" "}
                  {trend.failed}
                </span>

                <span className="text-yellow-600">
                  Pending:
                  {" "}
                  {trend.pending}
                </span>

              </div>

            </div>

          ))}

        </div>

      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">
                Customer
              </th>

              <th className="px-4 py-3 text-left">
                Phone
              </th>

              <th className="px-4 py-3 text-left">
                Status
              </th>

              <th className="px-4 py-3 text-left">
                Provider
              </th>

              <th className="px-4 py-3 text-left">
                Cost
              </th>

              <th className="px-4 py-3 text-left">
                Sent
              </th>

            </tr>

          </thead>

          <tbody>

            {paginatedMessages.length ===
            0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  No SMS records found.
                </td>

              </tr>

            ) : (

              paginatedMessages.map(
                (sms) => (

                  <tr
                    key={sms.id}
                    className="border-t"
                  >

                    <td className="px-4 py-3">

                      <div className="font-medium">
                        {sms.customer_name ??
                          "-"}
                      </div>

                    </td>

                    <td className="px-4 py-3">
                      {sms.phone}
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

                    <td className="px-4 py-3">
                      {sms.provider ??
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      KES{" "}
                      {sms.cost.toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
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
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Previous
        </button>

        <span>
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
          className="rounded border px-4 py-2 disabled:opacity-50"
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
    <div className="rounded-lg border bg-white p-5 shadow-sm">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <h2 className="mt-2 text-2xl font-bold">
        {value}
      </h2>

    </div>
  );
}

