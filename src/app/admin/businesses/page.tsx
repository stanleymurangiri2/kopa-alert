"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  business_code: string;
  business_name: string;
  phone: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  subscription_tier: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<Business["status"], string> = {
  approved: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  suspended: "bg-destructive/10 text-destructive",
  rejected: "bg-blacklist text-blacklist-foreground",
};

const PAGE_SIZE = 15;

export default function BusinessesPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | Business["status"]>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const [{ data: businessData, error: businessError }, { data: customerData }] =
      await Promise.all([
        supabase
          .from("businesses")
          .select(
            "id, business_code, business_name, phone, email, status, subscription_tier, created_at"
          )
          .order("business_name"),
        supabase.from("customers").select("business_id"),
      ]);

    if (businessError) {
      setError(`Failed to load businesses: ${businessError.message}`);
      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of customerData ?? []) {
      counts[row.business_id] = (counts[row.business_id] ?? 0) + 1;
    }

    setBusinesses((businessData ?? []) as Business[]);
    setCustomerCounts(counts);
    setLoading(false);
  }

  const filteredBusinesses = useMemo(() => {
    let rows = businesses;

    if (statusFilter !== "all") {
      rows = rows.filter((b) => b.status === statusFilter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (b) =>
          b.business_name.toLowerCase().includes(query) ||
          b.business_code.toLowerCase().includes(query) ||
          b.email.toLowerCase().includes(query) ||
          b.phone.toLowerCase().includes(query)
      );
    }

    return rows;
  }, [businesses, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / PAGE_SIZE));
  const paginatedBusinesses = filteredBusinesses.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (loading) {
    return <main className="p-8 text-muted-foreground">Loading businesses...</main>;
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Management</h1>
          <p className="mt-1 text-muted-foreground">
            {businesses.length} registered business{businesses.length === 1 ? "" : "es"}.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search business, code, email, or phone..."
            className="w-72 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | Business["status"]);
            setPage(1);
          }}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-card border border-border shadow">
        <table className="w-full">
          <thead className="bg-primary">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Code
              </th>
              <th className="sticky left-0 z-20 bg-primary px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Business
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Email
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Customers
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Plan
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedBusinesses.length > 0 ? (
              paginatedBusinesses.map((business, i) => (
                <tr
                  key={business.id}
                  className={`group border-t border-border hover:bg-accent ${
                    i % 2 === 1 ? "bg-table-stripe" : "bg-card"
                  }`}
                >
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {business.business_code}
                  </td>

                  <td
                    className={`sticky left-0 z-10 px-6 py-4 text-[15px] font-semibold text-foreground group-hover:bg-accent ${
                      i % 2 === 1 ? "bg-table-stripe" : "bg-card"
                    }`}
                  >
                    {business.business_name}
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {business.phone}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">{business.email}</td>

                  <td className="px-6 py-4 text-right font-mono text-foreground">
                    {customerCounts[business.id] ?? 0}
                  </td>

                  <td className="px-6 py-4 text-sm capitalize text-muted-foreground">
                    {business.subscription_tier ?? "—"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[business.status]}`}
                    >
                      {business.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                  No businesses match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredBusinesses.length > 0 && (
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
