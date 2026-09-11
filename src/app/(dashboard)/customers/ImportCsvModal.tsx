'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizeKenyanPhone, isValidKenyanPhone } from '@/lib/utils/phone';
import type ExcelJS from 'exceljs';

type ParsedRow = {
  line: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  type: string;
  amount: string;
  description: string;
  due_date: string;
  payment_method: string;
  date: string;
  errors: string[];
};

type ImportRowResult = {
  row: number;
  success: boolean;
  error?: string;
};

const TEMPLATE_CSV = `customer_name,customer_phone,customer_email,type,amount,description,due_date,payment_method,date
Stanley Murangiri,0740305253,stanleymurangiri2@gmail.com,DEBT,5000,2 bags of cement,2026-08-15,,2026-08-01
Stanley Murangiri,0740305253,stanleymurangiri2@gmail.com,PAYMENT,2000,Partial payment,,cash,2026-08-20
`;

const REQUIRED_HEADERS = [
  'customer_name',
  'customer_phone',
  'customer_email',
  'type',
  'amount',
  'description',
  'due_date',
  'payment_method',
  'date',
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const INSTRUCTIONS =
  '1. Do not change the grey column titles in row 3.\n' +
  "2. Row 4 is an example - replace it with your own customer's details, or delete it.\n" +
  '3. Click a cell in the "type" or "payment_method" column to pick from a list instead of typing.\n' +
  '4. One row = one debt or one payment. Add as many rows as you need below.\n' +
  '5. When you are done, save this file and upload it back into KopaAlert.';

const TYPE_OPTIONS = ['DEBT', 'PAYMENT'];
const PAYMENT_METHOD_OPTIONS = ['mpesa', 'cash', 'bank_transfer', 'cheque'];
const TEMPLATE_DATA_ROW_COUNT = 200;

/**
 * A plain .csv file can't lock or freeze anything - there's no formatting or
 * protection metadata in the CSV format at all. Building the downloadable
 * template as a real .xlsx instead lets the header row be frozen in view and
 * locked from accidental edits, and lets "type"/"payment_method" be picked
 * from a dropdown instead of typed - both aimed at someone who isn't
 * comfortable with spreadsheets or with English column names.
 */
async function buildTemplateWorkbook() {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  sheet.columns = REQUIRED_HEADERS.map((key) => ({
    key,
    width: key === 'description' ? 28 : key === 'customer_email' ? 24 : 18,
  }));

  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = 'KopaAlert Import Template';
  sheet.mergeCells(1, 1, 1, REQUIRED_HEADERS.length);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  titleRow.height = 22;

  const instructionsRow = sheet.getRow(2);
  instructionsRow.getCell(1).value = INSTRUCTIONS;
  sheet.mergeCells(2, 1, 2, REQUIRED_HEADERS.length);
  instructionsRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  instructionsRow.height = 80;

  const headerRow = sheet.getRow(3);
  REQUIRED_HEADERS.forEach((key, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = key;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C75' } };
  });

  const exampleRow = sheet.getRow(4);
  const example = [
    'Stanley Murangiri',
    '0740305253',
    'stanleymurangiri2@gmail.com',
    'DEBT',
    5000,
    '2 bags of cement',
    '2026-08-15',
    '',
    '2026-08-01',
  ];
  example.forEach((value, i) => {
    const cell = exampleRow.getCell(i + 1);
    cell.value = value;
    cell.font = { italic: true, color: { argb: 'FF6B7280' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
  });

  const typeColIndex = REQUIRED_HEADERS.indexOf('type') + 1;
  const paymentMethodColIndex = REQUIRED_HEADERS.indexOf('payment_method') + 1;
  const dueDateColIndex = REQUIRED_HEADERS.indexOf('due_date') + 1;
  const dateColIndex = REQUIRED_HEADERS.indexOf('date') + 1;
  const amountColIndex = REQUIRED_HEADERS.indexOf('amount') + 1;

  const firstDataRow = 5;
  const lastDataRow = firstDataRow + TEMPLATE_DATA_ROW_COUNT - 1;

  for (let r = firstDataRow; r <= lastDataRow; r++) {
    const row = sheet.getRow(r);

    row.getCell(typeColIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${TYPE_OPTIONS.join(',')}"`],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid type',
      error: 'Please pick DEBT or PAYMENT from the dropdown.',
    };

    row.getCell(paymentMethodColIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${PAYMENT_METHOD_OPTIONS.join(',')}"`],
    };

    row.getCell(dueDateColIndex).numFmt = 'yyyy-mm-dd';
    row.getCell(dateColIndex).numFmt = 'yyyy-mm-dd';
    row.getCell(amountColIndex).numFmt = '#,##0.00';

    // Sheet protection locks every cell by default once enabled below -
    // explicitly unlock every column on every data row so it stays a normal,
    // freely-editable spreadsheet from row 4 down. Only the title,
    // instructions and header rows (1-3) keep the default locked state.
    REQUIRED_HEADERS.forEach((_, i) => {
      row.getCell(i + 1).protection = { locked: false };
    });
  }

  REQUIRED_HEADERS.forEach((_, i) => {
    exampleRow.getCell(i + 1).protection = { locked: false };
  });

  // No password - this isn't a security boundary, it's a guardrail against
  // someone accidentally typing over the column titles they need to leave
  // alone. Excel still shows "Unprotect Sheet" for anyone who wants it off.
  sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: true,
    deleteRows: false,
  });

  return workbook;
}

async function downloadTemplate() {
  const workbook = await buildTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'kopaalert-import-template.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Reads an uploaded .xlsx back into the same string[][] shape parseCsv()
 * produces, so every downstream step (header check, validateRow, preview,
 * import) is shared code - the file format is the only thing that differs.
 * The header row isn't assumed to be row 1: the template puts a title and
 * instructions above it, so this scans for whichever row actually contains
 * the column titles.
 */
async function parseXlsxFile(file: File): Promise<string[][]> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const allRows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    const cellCount = Math.max(row.cellCount, REQUIRED_HEADERS.length);
    for (let c = 1; c <= cellCount; c++) {
      cells.push(cellToString(row.getCell(c).value));
    }
    if (cells.some((cell) => cell.trim() !== '')) {
      allRows.push(cells);
    }
  });

  const headerRowIndex = allRows.findIndex((row) =>
    row.some((cell) => cell.trim().toLowerCase() === 'customer_name')
  );

  return headerRowIndex === -1 ? allRows : allRows.slice(headerRowIndex);
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // ExcelJS parses date-formatted cells as UTC-based Dates - use the UTC
    // getters, not local ones, or this shifts by a day near midnight
    // depending on the machine's timezone.
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '');
  if (typeof value === 'object' && 'richText' in value) {
    return value.richText.map((t) => t.text).join('');
  }
  return String(value);
}

function validateRow(raw: Record<string, string>, line: number): ParsedRow {
  const errors: string[] = [];

  const customer_name = (raw.customer_name ?? '').trim();
  const customer_phone = (raw.customer_phone ?? '').trim();
  const customer_email = (raw.customer_email ?? '').trim();
  const type = (raw.type ?? '').trim().toUpperCase();
  const amount = (raw.amount ?? '').trim();
  const description = (raw.description ?? '').trim();
  const due_date = (raw.due_date ?? '').trim();
  const payment_method = (raw.payment_method ?? '').trim();
  const date = (raw.date ?? '').trim();

  if (!customer_name) errors.push('Customer name is required.');

  if (!customer_phone) {
    errors.push('Customer phone is required.');
  } else if (!isValidKenyanPhone(customer_phone)) {
    errors.push('Phone is not a valid Kenyan mobile number.');
  }

  if (type !== 'DEBT' && type !== 'PAYMENT') {
    errors.push('Type must be DEBT or PAYMENT.');
  }

  const numericAmount = parseFloat(amount);
  if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
    errors.push('Amount must be a positive number.');
  }

  if (type === 'DEBT') {
    if (!description) errors.push('Description is required for a DEBT row.');
    if (!due_date || isNaN(new Date(due_date).getTime())) {
      errors.push('Due date is required for a DEBT row (YYYY-MM-DD).');
    }
  }

  if (date && isNaN(new Date(date).getTime())) {
    errors.push('Date is not a valid date (YYYY-MM-DD).');
  }

  return {
    line,
    customer_name,
    customer_phone,
    customer_email,
    type,
    amount,
    description,
    due_date,
    payment_method,
    date,
    errors,
  };
}

export default function ImportCsvModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const supabase = createClient();

  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function applyParsedTable(table: string[][]) {
    if (table.length === 0) {
      setFileError('The file is empty.');
      return;
    }

    const header = table[0].map((h) => h.trim().toLowerCase());
    const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
    if (missing.length > 0) {
      setFileError(`Missing column(s): ${missing.join(', ')}. Download the template to see the expected format.`);
      return;
    }

    const dataRows = table.slice(1).map((cells, i) => {
      const raw: Record<string, string> = {};
      header.forEach((h, colIndex) => {
        raw[h] = cells[colIndex] ?? '';
      });
      return validateRow(raw, i + 2);
    });

    setRows(dataRows);
    setStep('preview');
  }

  function handleFile(file: File) {
    setFileError(null);

    const isXlsx =
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (isXlsx) {
      setParsingFile(true);
      parseXlsxFile(file)
        .then((table) => applyParsedTable(table))
        .catch(() => setFileError('Could not read this Excel file. Make sure it was saved as .xlsx.'))
        .finally(() => setParsingFile(false));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => applyParsedTable(parseCsv(String(reader.result ?? '')));
    reader.onerror = () => setFileError('Could not read the file.');
    reader.readAsText(file);
  }

  async function runImport() {
    setImporting(true);
    setImportError(null);

    // FIFO payment matching depends on rows being replayed in the order
    // things actually happened - sort by the transaction date, undated
    // rows (defaulting to "today" server-side) sort last.
    const sorted = [...validRows].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Infinity;
      const db = b.date ? new Date(b.date).getTime() : Infinity;
      return da - db;
    });

    const payload = sorted.map((r) => ({
      customer_name: r.customer_name,
      customer_phone: normalizeKenyanPhone(r.customer_phone),
      customer_email: r.customer_email || null,
      type: r.type,
      amount: r.amount,
      description: r.description || null,
      due_date: r.due_date || null,
      payment_method: r.payment_method || null,
      date: r.date || null,
    }));

    const { data, error } = await supabase.rpc('import_customer_transactions', {
      p_rows: payload,
    });

    setImporting(false);

    if (error) {
      setImportError(error.message);
      return;
    }

    setResults((data ?? []) as ImportRowResult[]);
    setStep('result');
  }

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-lg bg-card p-6 shadow-xl max-h-[90vh]">
        <h2 className="text-lg font-bold text-foreground">Import Customers &amp; Transactions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Catch up on debts and payments that happened offline - a customer can be new or existing.
        </p>

        {step === 'upload' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">New here? Start with the template.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                It&apos;s a ready-to-fill spreadsheet: the column titles are locked so they can&apos;t be
                changed by accident, and you pick &quot;type&quot; and &quot;payment method&quot; from a list
                instead of typing them.
              </p>
              <button
                type="button"
                onClick={async () => {
                  setTemplateDownloading(true);
                  try {
                    await downloadTemplate();
                  } finally {
                    setTemplateDownloading(false);
                  }
                }}
                disabled={templateDownloading}
                className="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {templateDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Template (Excel)
              </button>
            </div>

            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                Upload the filled-in template, or any .csv/.xlsx file with the same columns.
              </p>
              {parsingFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading file...
                </div>
              ) : (
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="mx-auto block text-sm text-foreground"
                />
              )}
            </div>

            {fileError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {fileError}
              </div>
            )}

            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-foreground">Columns</p>
              <p>
                customer_name, customer_phone, customer_email (optional), type (DEBT or PAYMENT),
                amount, description, due_date (DEBT only), payment_method (PAYMENT only, optional),
                date (when it actually happened - defaults to today if left blank).
              </p>
              <p className="mt-2">
                A PAYMENT row applies to that customer&apos;s oldest unpaid debt automatically.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="mt-4 flex flex-1 flex-col overflow-hidden">
            <div className="mb-3 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-4 w-4" /> {validRows.length} valid
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> {invalidRows.length} invalid (will be skipped)
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-primary">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold uppercase text-primary-foreground">Line</th>
                    <th className="px-3 py-2 text-left font-bold uppercase text-primary-foreground">Customer</th>
                    <th className="px-3 py-2 text-left font-bold uppercase text-primary-foreground">Type</th>
                    <th className="px-3 py-2 text-right font-bold uppercase text-primary-foreground">Amount</th>
                    <th className="px-3 py-2 text-left font-bold uppercase text-primary-foreground">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} className={`border-t border-border ${r.errors.length > 0 ? 'bg-destructive/5' : ''}`}>
                      <td className="px-3 py-2 text-muted-foreground">{r.line}</td>
                      <td className="px-3 py-2 text-foreground">{r.customer_name || '-'}</td>
                      <td className="px-3 py-2 text-foreground">{r.type || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{r.amount || '-'}</td>
                      <td className="px-3 py-2 text-destructive">{r.errors.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {importError}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={importing}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={importing || validRows.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90 disabled:opacity-50"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                {importing ? 'Importing...' : `Import ${validRows.length} row${validRows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && results && (
          <div className="mt-4 flex flex-1 flex-col overflow-hidden">
            <div className="mb-3 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-4 w-4" /> {successCount} imported
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> {failCount} failed
                </span>
              )}
            </div>

            {failCount > 0 && (
              <div className="flex-1 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-primary">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold uppercase text-primary-foreground">Line</th>
                      <th className="px-3 py-2 text-left font-bold uppercase text-primary-foreground">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
                      .filter((r) => !r.success)
                      .map((r) => (
                        <tr key={r.row} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">
                            {sortedLineForRow(rows, validRows, r.row)}
                          </td>
                          <td className="px-3 py-2 text-destructive">{r.error}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onImported}
                className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-teal-foreground hover:bg-teal/90"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// The server processes rows in the sorted (by date) order, so a failed
// row's index there doesn't match its original line number in the file -
// map it back for a useful error message.
function sortedLineForRow(allRows: ParsedRow[], validRows: ParsedRow[], serverRowIndex: number): number {
  const sorted = [...validRows].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Infinity;
    const db = b.date ? new Date(b.date).getTime() : Infinity;
    return da - db;
  });
  return sorted[serverRowIndex - 1]?.line ?? serverRowIndex;
}
