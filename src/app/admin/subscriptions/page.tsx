"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  business_code: string;
  business_name: string;
  subscription_tier: string;
  subscription_price: number | null;
  subscription_status: string;
  subscription_expires_at: string | null;
  subscription_last_payment_at: string | null;
};

const PAGE_SIZE = 15;

export default function SubscriptionsPage() {
  const supabase = createClient();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("businesses")
      .select(
        "id, business_code, business_name, subscription_tier, subscription_price, subscription_status, subscription_expires_at, subscription_last_payment_at"
      )
      .neq("subscription_tier", "free")
      .order("subscription_expires_at", { ascending: true, nullsFirst: false });

    if (loadError) {
      setError(`Failed to load subscriptions: ${loadError.message}`);
      setLoading(false);
      return;
    }

    setBusinesses((data ?? []) as Business[]);
    setLoading(false);
  }

  const filteredBusinesses = useMemo(() => {
    let rows = businesses;

    if (statusFilter !== "all") {
      rows = rows.filter((b) => b.subscription_status === statusFilter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (b) =>
          b.business_name.toLowerCase().includes(query) ||
          b.business_code.toLowerCase().includes(query)
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
    return <main className="p-8 text-muted-foreground">Loading subscriptions...</main>;
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscriptions</h1>
          <p className="mt-1 text-muted-foreground">
            {businesses.length} paid business{businesses.length === 1 ? "" : "es"}.
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
            placeholder="Search business or code..."
            className="w-72 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | "active" | "locked");
            setPage(1);
          }}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-card border border-border shadow">
        <table className="w-full">
          <thead className="bg-primary">
            <tr>
              <th className="sticky left-0 z-20 bg-primary px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Business
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Expires
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Last Payment
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
                  <td
                    className={`sticky left-0 z-10 px-6 py-4 text-[15px] font-semibold text-foreground group-hover:bg-accent ${
                      i % 2 === 1 ? "bg-table-stripe" : "bg-card"
                    }`}
                  >
                    {business.business_name}
                    <div className="font-mono text-xs font-normal text-muted-foreground">
                      {business.business_code}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right font-mono text-foreground">
                    {business.subscription_tier === "lifetime"
                      ? "Lifetime"
                      : `KES ${Number(business.subscription_price ?? 0).toLocaleString()}`}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        business.subscription_status === "locked"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {business.subscription_status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {business.subscription_expires_at
                      ? new Date(business.subscription_expires_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {business.subscription_last_payment_at
                      ? new Date(business.subscription_last_payment_at).toLocaleDateString()
                      : "—"}
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
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  No paid subscriptions yet.
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
