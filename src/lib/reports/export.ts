import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportOptions {
  title: string;
  filename: string;
  columns: ExportColumn[];
}

function formatValue(value: unknown): string | number {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return value as string | number;
}

/**
 * --------------------------------------------------------
 * CSV Export
 * --------------------------------------------------------
 */

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
) {
  const rows = [
    options.columns.map((column) => column.label),

    ...data.map((row) =>
      options.columns.map((column) =>
        formatValue(row[column.key])
      )
    ),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  downloadFile(
    new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    }),
    `${options.filename}.csv`
  );
}

/**
 * --------------------------------------------------------
 * Excel Export
 * --------------------------------------------------------
 */

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
) {
  const worksheetData = data.map((row) => {
    const result: Record<string, unknown> = {};

    options.columns.forEach((column) => {
      result[column.label] = formatValue(
        row[column.key]
      );
    });

    return result;
  });

  const workbook =
    XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet(
      worksheetData
    );

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Report"
  );

  XLSX.writeFile(
    workbook,
    `${options.filename}.xlsx`
  );
}

/**
 * --------------------------------------------------------
 * PDF Export
 * --------------------------------------------------------
 */

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
) {
  const pdf = new jsPDF();

  pdf.setFontSize(18);

  pdf.text(
    options.title,
    14,
    18
  );

  pdf.setFontSize(10);

  pdf.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    25
  );

  autoTable(pdf, {
    startY: 32,

    head: [
      options.columns.map(
        (column) => column.label
      ),
    ],

    body: data.map((row) =>
      options.columns.map((column) =>
        formatValue(
          row[column.key]
        )
      )
    ),

    styles: {
      fontSize: 9,
    },

    headStyles: {
      fillColor: [41, 128, 185],
    },
  });

  pdf.save(
    `${options.filename}.pdf`
  );
}

/**
 * --------------------------------------------------------
 * Shared Download
 * --------------------------------------------------------
 */

function downloadFile(
  blob: Blob,
  filename: string
) {
  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}