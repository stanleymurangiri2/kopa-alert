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
        `/api/reports/debts?${params.toString()}`
      );

      const result: ApiResponse = await response.json();

      if (result.success) {
        setDebts(result.debts);
        setSummary(result.summary);
      } else {
        setError(result.message || "Failed to load debt reports.");
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
        return "bg-warning/10 text-warning";

      case "partially_paid":
        return "bg-info/10 text-info";

      case "fully_paid":
        return "bg-success/10 text-success";

      case "overdue":
        return "bg-destructive/10 text-destructive";

      default:
        return "bg-muted text-muted-foreground";
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading debt reports...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-foreground">
            Debt Reports
          </h1>

          <p className="text-muted-foreground">
            Collection performance and outstanding balances.
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

      {summary && (

        <div className="grid gap-4 md:grid-cols-4">

          <Card
            title="Pending"
            value={summary.pendingCount}
            tone="warning"
          />

          <Card
            title="Partially Paid"
            value={summary.partiallyPaidCount}
            tone="info"
          />

          <Card
            title="Overdue"
            value={summary.overdueCount}
            tone="destructive"
          />

          <Card
            title="Fully Paid"
            value={summary.fullyPaidCount}
            tone="success"
          />

        </div>

      )}

      <div className="rounded-lg border border-border bg-card p-4">

        <div className="grid gap-4 md:grid-cols-4">

          <input
            className="rounded-md border border-border bg-card p-2 text-foreground"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="rounded-md border border-border bg-card p-2 text-foreground"
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
            className="rounded-md border border-border bg-card p-2 text-foreground"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
          />

          <input
            type="date"
            className="rounded-md border border-border bg-card p-2 text-foreground"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card">

        <table className="min-w-full">

          <thead className="bg-primary">

            <tr>

              <th className="sticky left-0 z-20 bg-primary px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Customer
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Amount
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Paid
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Balance
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Due Date
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {paginatedDebts.length === 0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No debts found.
                </td>

              </tr>

            ) : (

              paginatedDebts.map((debt, i) => (

                <tr
                  key={debt.id}
                  className={`group border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                >

                  <td className={`sticky left-0 z-10 px-4 py-3 group-hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}>

                    <div className="text-[15px] font-semibold text-foreground">
                      {debt.customer_name}
                    </div>

                    <div className="font-mono text-sm text-muted-foreground">
                      {debt.phone}
                    </div>

                  </td>

                  <td className="px-4 py-3 font-mono text-foreground">
                    KES {debt.amount.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 font-mono text-success">
                    KES {debt.amount_paid.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    KES {debt.balance.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
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
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() =>
            setPage((p) => p + 1)
          }
          className="rounded-md border border-border px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
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
  tone,
}: {
  title: string;
  value: string | number;
  tone?: "warning" | "info" | "destructive" | "success";
}) {
  const toneClasses: Record<string, string> = {
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
    success: "text-success",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <h2 className={`mt-2 font-mono text-2xl font-bold ${tone ? toneClasses[tone] : "text-foreground"}`}>
        {value}
      </h2>
    </div>
  );
}
