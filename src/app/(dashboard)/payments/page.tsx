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

  async function loadReport() {
    setLoading(true);

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
      }
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

          <h1 className="text-3xl font-bold">
            Payment Reports
          </h1>

          <p className="text-gray-500">
            View collections and payment history.
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

      <div className="rounded-lg border bg-white p-5">

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

      {summary && (

        <div className="rounded-lg border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Payment Method Breakdown
          </h2>

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-gray-100">

                <tr>

                  <th className="px-4 py-3 text-left">
                    Method
                  </th>

                  <th className="px-4 py-3 text-left">
                    Transactions
                  </th>

                  <th className="px-4 py-3 text-left">
                    Total
                  </th>

                </tr>

              </thead>

              <tbody>

                {summary.methods.map((method) => (

                  <tr
                    key={method.method}
                    className="border-t"
                  >

                    <td className="px-4 py-3 capitalize">
                      {method.method}
                    </td>

                    <td className="px-4 py-3">
                      {method.count}
                    </td>

                    <td className="px-4 py-3">
                      KES {method.total.toLocaleString()}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

      <div className="overflow-hidden rounded-lg border bg-white">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">
                Customer
              </th>

              <th className="px-4 py-3 text-left">
                Method
              </th>

              <th className="px-4 py-3 text-left">
                Amount
              </th>

              <th className="px-4 py-3 text-left">
                Date
              </th>

              <th className="px-4 py-3 text-left">
                Notes
              </th>

            </tr>

          </thead>

          <tbody>

            {paginated.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="py-8 text-center text-gray-500"
                >
                  No payments found.
                </td>

              </tr>

            ) : (

              paginated.map((payment) => (

                <tr
                  key={payment.id}
                  className="border-t"
                >

                  <td className="px-4 py-3">

                    <div className="font-medium">
                      {payment.customer_name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {payment.phone}
                    </div>

                  </td>

                  <td className="px-4 py-3 capitalize">
                    {payment.payment_method}
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    KES {payment.amount_paid.toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    {new Date(
                      payment.created_at
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">
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