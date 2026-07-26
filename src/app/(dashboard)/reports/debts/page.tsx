"use client";

import { useEffect, useMemo, useState } from "react";

interface DebtReport {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  amount: number;
  amount_paid: number;
  balance: number;
  status: "pending" | "partially_paid" | "fully_paid" | "overdue";
  due_date: string;
  description: string;
  created_at: string;
}

interface Summary {
  totalDebts: number;
  totalAmount: number;
  totalPaid: number;
  outstandingBalance: number;
  pendingCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
  fullyPaidCount: number;
}

interface ApiResponse {
  success: boolean;
  summary: Summary;
  debts: DebtReport[];
  message?: string;
}

const PAGE_SIZE = 10;

export default function DebtReportsPage() {
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<DebtReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
        `/api/reports/debts?${params.toString()}`
      );

      const result: ApiResponse = await response.json();

      if (result.success) {
        setDebts(result.debts);
        setSummary(result.summary);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      const matchesSearch =
        debt.customer_name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        debt.phone.includes(search) ||
        debt.description
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        debt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [debts, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDebts.length / PAGE_SIZE)
  );

  const paginatedDebts = filteredDebts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function badge(status: string) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "partially_paid":
        return "bg-blue-100 text-blue-700";

      case "fully_paid":
        return "bg-green-100 text-green-700";

      case "overdue":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100";
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading debt reports...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Debt Reports
          </h1>

          <p className="text-gray-500">
            Collection performance and outstanding balances.
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

        <div className="grid gap-4 md:grid-cols-4">

          <Card
            title="Total Debts"
            value={summary.totalDebts}
          />

          <Card
            title="Debt Value"
            value={`KES ${summary.totalAmount.toLocaleString()}`}
          />

          <Card
            title="Collected"
            value={`KES ${summary.totalPaid.toLocaleString()}`}
          />

          <Card
            title="Outstanding"
            value={`KES ${summary.outstandingBalance.toLocaleString()}`}
          />

        </div>

      )}

      <div className="rounded-lg border bg-white p-4">

        <div className="grid gap-4 md:grid-cols-4">

          <input
            className="rounded border p-2"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="rounded border p-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">
              All Status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="partially_paid">
              Partially Paid
            </option>

            <option value="fully_paid">
              Fully Paid
            </option>

            <option value="overdue">
              Overdue
            </option>

          </select>

          <input
            type="date"
            className="rounded border p-2"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
          />

          <input
            type="date"
            className="rounded border p-2"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
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

      <div className="overflow-hidden rounded-lg border bg-white">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">
                Customer
              </th>

              <th className="px-4 py-3 text-left">
                Amount
              </th>

              <th className="px-4 py-3 text-left">
                Paid
              </th>

              <th className="px-4 py-3 text-left">
                Balance
              </th>

              <th className="px-4 py-3 text-left">
                Due Date
              </th>

              <th className="px-4 py-3 text-left">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {paginatedDebts.length === 0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  No debts found.
                </td>

              </tr>

            ) : (

              paginatedDebts.map((debt) => (

                <tr
                  key={debt.id}
                  className="border-t"
                >

                  <td className="px-4 py-3">

                    <div className="font-medium">
                      {debt.customer_name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {debt.phone}
                    </div>

                  </td>

                  <td className="px-4 py-3">
                    KES {debt.amount.toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    KES {debt.amount_paid.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    KES {debt.balance.toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    {new Date(
                      debt.due_date
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(
                        debt.status
                      )}`}
                    >
                      {debt.status.replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      <div className="flex items-center justify-between">

        <button
          disabled={page === 1}
          onClick={() =>
            setPage((p) => p - 1)
          }
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Previous
        </button>

        <span>
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() =>
            setPage((p) => p + 1)
          }
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Next
        </button>

      </div>

    </div>
  );
}

function Card({
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