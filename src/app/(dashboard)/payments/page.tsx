"use client";

import { useEffect, useMemo, useState } from "react";

interface PaymentReport {
  id: string;
  debt_id: string;
  customer_name: string;
  phone: string;
  amount_paid: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface PaymentMethodSummary {
  method: string;
  count: number;
  total: number;
}

interface PaymentSummary {
  totalPayments: number;
  totalCollected: number;
  averagePayment: number;
  largestPayment: number;
  smallestPayment: number;
  methods: PaymentMethodSummary[];
}

interface ApiResponse {
  success: boolean;
  summary: PaymentSummary;
  payments: PaymentReport[];
  message?: string;
}

const PAGE_SIZE = 10;

export default function PaymentReportsPage() {
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<PaymentReport[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);

  const [search, setSearch] = useState("");

  const [methodFilter, setMethodFilter] = useState("all");

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

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `/api/reports/payments?${params.toString()}`
      );

      const result: ApiResponse = await response.json();

      if (result.success) {
        setPayments(result.payments);
        setSummary(result.summary);
      } else {
        setError(result.message || "Failed to load payment reports.");
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

  const methods = useMemo(() => {
    return [...new Set(payments.map((p) => p.payment_method))];
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.customer_name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        payment.phone.includes(search);

      const matchesMethod =
        methodFilter === "all" ||
        payment.payment_method === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [payments, search, methodFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / PAGE_SIZE)
  );

  const paginated = filteredPayments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="p-6">
        Loading payment reports...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-foreground">
            Payment Reports
          </h1>

          <p className="text-muted-foreground">
            View collections and payment history.
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

        <div className="grid gap-4 md:grid-cols-5">

          <SummaryCard
            title="Payments"
            value={summary.totalPayments}
          />

          <SummaryCard
            title="Collected"
            value={`KES ${summary.totalCollected.toLocaleString()}`}
          />

          <SummaryCard
            title="Average"
            value={`KES ${summary.averagePayment.toLocaleString()}`}
          />

          <SummaryCard
            title="Largest"
            value={`KES ${summary.largestPayment.toLocaleString()}`}
          />

          <SummaryCard
            title="Smallest"
            value={`KES ${summary.smallestPayment.toLocaleString()}`}
          />

        </div>

      )}

      <div className="rounded-lg border border-border bg-card p-5">

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
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">
              All Methods
            </option>

            {methods.map((method) => (
              <option
                key={method}
                value={method}
              >
                {method}
              </option>
            ))}

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

      {summary && (

        <div className="rounded-lg border border-border bg-card p-5">

          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Payment Method Breakdown
          </h2>

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-primary">

                <tr>

                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                    Method
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                    Transactions
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                    Total
                  </th>

                </tr>

              </thead>

              <tbody>

                {summary.methods.map((method, i) => (

                  <tr
                    key={method.method}
                    className={`border-t border-border ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                  >

                    <td className="px-4 py-3 capitalize text-foreground">
                      {method.method}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {method.count}
                    </td>

                    <td className="px-4 py-3 font-mono text-foreground">
                      KES {method.total.toLocaleString()}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">

        <table className="min-w-full">

          <thead className="bg-primary">

            <tr>

              <th className="sticky left-0 z-20 bg-primary px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Customer
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Method
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Amount
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Date
              </th>

              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Notes
              </th>

            </tr>

          </thead>

          <tbody>

            {paginated.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No payments found.
                </td>

              </tr>

            ) : (

              paginated.map((payment, i) => (

                <tr
                  key={payment.id}
                  className={`group border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                >

                  <td className={`sticky left-0 z-10 px-4 py-3 group-hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}>

                    <div className="text-[15px] font-semibold text-foreground">
                      {payment.customer_name}
                    </div>

                    <div className="font-mono text-sm text-muted-foreground">
                      {payment.phone}
                    </div>

                  </td>

                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {payment.payment_method}
                  </td>

                  <td className="px-4 py-3 font-mono font-semibold text-success">
                    KES {payment.amount_paid.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(
                      payment.created_at
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.notes ?? "-"}
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
