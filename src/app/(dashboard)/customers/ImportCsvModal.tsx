'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizeKenyanPhone, isValidKenyanPhone } from '@/lib/utils/phone';

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

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'kopaalert-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
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
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function handleFile(file: File) {
    setFileError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const table = parseCsv(text);

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
    };
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
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </button>

            <div className="rounded-md border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="mx-auto block text-sm text-foreground"
              />
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
