"use client";

import { useState, useEffect } from "react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
  onReset?: () => void;
  className?: string;
  loading?: boolean;
}

export default function DateRangeFilter({
  startDate,
  endDate,
  onApply,
  onReset,
  className = "",
  loading = false,
}: DateRangeFilterProps) {
  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(endDate);

  useEffect(() => {
    setFrom(startDate);
  }, [startDate]);

  useEffect(() => {
    setTo(endDate);
  }, [endDate]);

  function handleApply() {
    onApply(from, to);
  }

  function handleReset() {
    setFrom("");
    setTo("");

    if (onReset) {
      onReset();
    } else {
      onApply("", "");
    }
  }

  return (
    <div
      className={`rounded-lg border bg-white p-5 shadow-sm ${className}`}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <div>
          <label className="mb-1 block text-sm font-medium">
            Start Date
          </label>

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            End Date
          </label>

          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleApply}
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Applying..." : "Apply Filter"}
          </button>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        </div>

      </div>
    </div>
  );
}