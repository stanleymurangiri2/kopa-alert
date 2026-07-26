"use client";

import { useMemo, useState } from "react";

export interface ReportColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface ReportTableProps<T> {
  data: T[];
  columns: ReportColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  getRowKey: (row: T) => string;
  className?: string;
}

export default function ReportTable<
  T extends Record<string, any>
>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  emptyMessage = "No records found.",
  getRowKey,
  className = "",
}: ReportTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [sortKey, setSortKey] = useState<
    string | null
  >(null);

  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("asc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (search.trim()) {
      const q = search.toLowerCase();

      rows = rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }

    if (sortKey) {
      rows.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue == null && bValue == null)
          return 0;

        if (aValue == null)
          return sortDirection === "asc"
            ? -1
            : 1;

        if (bValue == null)
          return sortDirection === "asc"
            ? 1
            : -1;

        if (
          typeof aValue === "number" &&
          typeof bValue === "number"
        ) {
          return sortDirection === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        return sortDirection === "asc"
          ? String(aValue).localeCompare(
              String(bValue)
            )
          : String(bValue).localeCompare(
              String(aValue)
            );
      });
    }

    return rows;
  }, [
    data,
    search,
    sortKey,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredData.length / pageSize
    )
  );

  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm ${className}`}
    >
      {searchable && (
        <div className="border-b p-4">
          <input
            type="text"
            value={search}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none md:w-80"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">

          <thead className="bg-gray-100">

            <tr>

              {columns.map((column) => (

                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-sm font-semibold ${column.className ?? ""}`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleSort(
                          String(column.key)
                        )
                      }
                      className="flex items-center gap-2"
                    >
                      {column.header}

                      {sortKey ===
                        column.key && (
                        <span>
                          {sortDirection ===
                          "asc"
                            ? "▲"
                            : "▼"}
                        </span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {loading ? (

              <tr>

                <td
                  colSpan={
                    columns.length
                  }
                  className="py-10 text-center"
                >
                  Loading...
                </td>

              </tr>

            ) : paginatedData.length ===
              0 ? (

              <tr>

                <td
                  colSpan={
                    columns.length
                  }
                  className="py-10 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>

              </tr>

            ) : (

              paginatedData.map((row) => (

                <tr
                  key={getRowKey(row)}
                  className="border-t hover:bg-gray-50"
                >

                  {columns.map(
                    (column) => (

                      <td
                        key={String(
                          column.key
                        )}
                        className={`px-4 py-3 ${column.className ?? ""}`}
                      >
                        {column.render
                          ? column.render(
                              row
                            )
                          : String(
                              row[
                                column
                                  .key as keyof T
                              ] ?? ""
                            )}
                      </td>

                    )
                  )}

                </tr>

              ))

            )}

          </tbody>

        </table>
      </div>

      <div className="flex items-center justify-between border-t p-4">

        <button
          type="button"
          disabled={page === 1}
          onClick={() =>
            setPage((p) => p - 1)
          }
          className="rounded border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-sm">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={
            page === totalPages
          }
          onClick={() =>
            setPage((p) => p + 1)
          }
          className="rounded border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>

      </div>

    </div>
  );
}