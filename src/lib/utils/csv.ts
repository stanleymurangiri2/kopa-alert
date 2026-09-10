const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutralizes CSV/formula injection: a field starting with =, +, -, @ (or a
 * leading tab/CR) is executed as a formula by Excel/Sheets when the file is
 * opened, not displayed as text. Prefixing with a single quote forces it to
 * render as literal text instead, without changing what the value says.
 */
export function sanitizeCsvField(value: unknown): string {
  const text = String(value ?? '');
  if (FORMULA_TRIGGER_CHARS.some((char) => text.startsWith(char))) {
    return `'${text}`;
  }
  return text;
}

export function toCsvCell(value: unknown): string {
  return `"${sanitizeCsvField(value).replace(/"/g, '""')}"`;
}
