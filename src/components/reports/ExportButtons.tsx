"use client";

import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  ExportColumn,
} from "@/lib/reports/export";

interface ExportButtonsProps<T extends Record<string, unknown>> {
  title: string;
  filename: string;
  data: T[];
  columns: ExportColumn[];
  className?: string;
}

export default function ExportButtons<
  T extends Record<string, unknown>
>({
  title,
  filename,
  data,
  columns,
  className = "",
}: ExportButtonsProps<T>) {
  function handleCSV() {
    exportToCSV(data, {
      title,
      filename,
      columns,
    });
  }

  function handleExcel() {
    exportToExcel(data, {
      title,
      filename,
      columns,
    });
  }

  function handlePDF() {
    exportToPDF(data, {
      title,
      filename,
      columns,
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className}`}
    >
      <button
        type="button"
        onClick={handleCSV}
        disabled={data.length === 0}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export CSV
      </button>

      <button
        type="button"
        onClick={handleExcel}
        disabled={data.length === 0}
        className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export Excel
      </button>

      <button
        type="button"
        onClick={handlePDF}
        disabled={data.length === 0}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export PDF
      </button>
    </div>
  );
}