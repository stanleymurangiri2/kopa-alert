/**
 * Normalizes a Kenyan phone number to international format (+254XXXXXXXXX).
 * Handles common input variations:
 *   0712345678   -> +254712345678
 *   712345678    -> +254712345678
 *   254712345678 -> +254712345678
 *   +254712345678 -> +254712345678 (unchanged)
 */
export function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");

  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+254${digits}`;
  }

  // Fallback: return as-is with a leading + if it looks numeric,
  // so we never silently corrupt a number we don't recognize.
  return input.trim().startsWith("+") ? input.trim() : `+${digits}`;
}
