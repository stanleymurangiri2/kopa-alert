"use client";

import { useEffect, useMemo, useState } from "react";

interface CustomerReport {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  totalDebts: number;
  totalDebtAmount: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueDebts: number;
  created_at: string;
}

interface CustomerSummary {
  totalCustomers: number;
  customersWithDebt: number;
  customersWithOverdueDebt: number;
  debtFreeCustomers: number;
  totalOutstandingBalance: number;
  totalDebtIssued: number;
  totalCollected: number;
}

interface ApiResponse {
  success: boolean;
  summary: CustomerSummary;
  customers: CustomerReport[];
  message?: string;
}

const PAGE_SIZE = 10;

export default function CustomerReportsPage() {
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<CustomerReport[]>([]);
  const [summary, setSummary] =
    useState<CustomerSummary | null>(null);

  const [search, setSearch] = useState("");

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
        `/api/reports/customers?${params.toString()}`
      );

      const result: ApiResponse =
        await response.json();

      if (result.success) {
        setCustomers(result.customers);
        setSummary(result.summary);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const q = search.toLowerCase();

      return (
        customer.full_name
          .toLowerCase()
          .includes(q) ||
        customer.phone.includes(search) ||
        (customer.email ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [customers, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredCustomers.length / PAGE_SIZE
    )
  );

  const paginatedCustomers =
    filteredCustomers.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE
    );

  if (loading) {
    return (
      <div className="p-6">
        Loading customer reports...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Customer Reports
          </h1>

          <p className="text-gray-500">
            Customer debt performance and balances.
          </p>

        </div>

        <button
          onClick={loadReport}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Refresh
        </button>

      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">

          <SummaryCard
            title="Customers"
            value={summary.totalCustomers}
          />

          <SummaryCard
            title="With Debt"
            value={summary.customersWithDebt}
          />

          <SummaryCard
            title="Overdue"
            value={
              summary.customersWithOverdueDebt
            }
          />

          <SummaryCard
            title="Debt Free"
            value={summary.debtFreeCustomers}
          />

          <SummaryCard
            title="Debt Issued"
            value={`KES ${summary.totalDebtIssued.toLocaleString()}`}
          />

          <SummaryCard
            title="Collected"
            value={`KES ${summary.totalCollected.toLocaleString()}`}
          />

          <SummaryCard
            title="Outstanding"
            value={`KES ${summary.totalOutstandingBalance.toLocaleString()}`}
          />

        </div>
      )}

      <div className="rounded-lg border bg-white p-5">

        <div className="grid gap-4 md:grid-cols-3">

          <input
            className="rounded border p-2"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

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
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-white hover:bg-black"
        >
          Apply Filters
        </button>

      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">

        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-4 py-3 text-left">
                Customer
              </th>

              <th className="px-4 py-3 text-left">
                Debts
              </th>

              <th className="px-4 py-3 text-left">
                Total Debt
              </th>

              <th className="px-4 py-3 text-left">
                Paid
              </th>

              <th className="px-4 py-3 text-left">
                Outstanding
              </th>

              <th className="px-4 py-3 text-left">
                Overdue
              </th>

            </tr>

          </thead>

          <tbody>

            {paginatedCustomers.length === 0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="py-10 text-center text-gray-500"
                >
                  No customers found.
                </td>

              </tr>

            ) : (

              paginatedCustomers.map(
                (customer) => (

                  <tr
                    key={customer.id}
                    className="border-t hover:bg-gray-50"
                  >

                    <td className="px-4 py-3">

                      <div className="font-medium">
                        {customer.full_name}
                      </div>

                      <div className="text-sm text-gray-500">
                        {customer.phone}
                      </div>

                      {customer.email && (
                        <div className="text-sm text-gray-500">
                          {customer.email}
                        </div>
                      )}

                    </td>

                    <td className="px-4 py-3">
                      {customer.totalDebts}
                    </td>

                    <td className="px-4 py-3">
                      KES{" "}
                      {customer.totalDebtAmount.toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-green-600">
                      KES{" "}
                      {customer.totalPaid.toLocaleString()}
                    </td>

                    <td className="px-4 py-3 font-semibold text-red-600">
                      KES{" "}
                      {customer.outstandingBalance.toLocaleString()}
                    </td>

                    <td className="px-4 py-3">

                      {customer.overdueDebts > 0 ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          {customer.overdueDebts}
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          None
                        </span>
                      )}

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

