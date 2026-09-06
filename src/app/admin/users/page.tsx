"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "super_admin" | "business_admin" | "employee";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  business_id: string | null;
  must_change_password: boolean | null;
  businesses: { business_name: string } | { business_name: string }[] | null;
};

const PAGE_SIZE = 15;

const ROLE_STYLES: Record<Role, string> = {
  super_admin: "bg-employee/10 text-employee",
  business_admin: "bg-primary/10 text-primary",
  employee: "bg-info/10 text-info",
};

function businessName(user: UserRow) {
  const rel = user.businesses;
  const b = Array.isArray(rel) ? rel[0] : rel;
  return b?.business_name ?? null;
}

export default function UsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("users")
      .select(
        "id, name, email, role, business_id, must_change_password, businesses(business_name)"
      )
      .order("name");

    if (error) {
      console.error("Admin users query failed:", error);
      setError("Failed to load users. Please refresh the page and try again.");
    } else {
      setUsers((data ?? []) as unknown as UserRow[]);
    }

    setLoading(false);
  }

  const filteredUsers = useMemo(() => {
    let rows = users;

    if (roleFilter !== "all") {
      rows = rows.filter((u) => u.role === roleFilter);
    }

    const query = search.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(query) ||
          (u.email ?? "").toLowerCase().includes(query) ||
          (businessName(u) ?? "").toLowerCase().includes(query)
      );
    }

    return rows;
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  if (loading) {
    return <main className="p-8 text-muted-foreground">Loading users...</main>;
  }

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>

        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>

          <p className="mt-2 text-muted-foreground">Manage every platform user.</p>
        </div>

        <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
          {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="my-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateFilter(setSearch, e.target.value)}
            placeholder="Search name, email, or business..."
            className="w-80 rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => updateFilter(setRoleFilter, e.target.value as "all" | Role)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="all">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="business_admin">Business Admin</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-card border border-border shadow">
        <table className="w-full">
          <thead className="bg-primary">
            <tr>
              <th className="sticky left-0 z-20 bg-primary px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Email</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Role</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Business</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user, i) => (
                <tr
                  key={user.id}
                  className={`group border-t border-border hover:bg-accent ${i % 2 === 1 ? "bg-table-stripe" : "bg-card"}`}
                >
                  <td
                    className={`sticky left-0 z-10 px-6 py-4 text-[15px] font-semibold text-foreground group-hover:bg-accent ${i % 2 === 1 ? "bg-table-stripe" : "bg-card"}`}
                  >
                    {user.name || "-"}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">{user.email || "-"}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${ROLE_STYLES[user.role]}`}
                    >
                      {user.role.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {businessName(user) ?? (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {user.must_change_password ? (
                      <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                        Invite sent
                      </span>
                    ) : (
                      <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        Active
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > 0 && (
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
