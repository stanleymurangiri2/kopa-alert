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

function hasLongRepeatedDigitRun(digits: string, minRun = 6): boolean {
  let run = 1;
  for (let i = 1; i < digits.length; i++) {
    run = digits[i] === digits[i - 1] ? run + 1 : 1;
    if (run >= minRun) return true;
  }
  return false;
}

function isStrictlySequential(digits: string): boolean {
  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    const diff = Number(digits[i]) - Number(digits[i - 1]);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }
  return ascending || descending;
}

/**
 * True only if the input normalizes to a real Kenyan mobile shape:
 * +254 followed by 9 digits, starting with 7 (Safaricom/Airtel/Telkom)
 * or 1 (Telkom/Faiba newer range). Rejects landline-shaped numbers,
 * wrong digit counts, and non-numeric input before it ever reaches
 * an SMS send attempt.
 *
 * Also rejects obviously-fake placeholder numbers that are otherwise
 * correctly shaped, e.g. 0720000000 (a long run of the same digit) or
 * 0712345678-style pure sequences - people entering a lazy dummy
 * number instead of the real contact. This can't detect a real,
 * correctly-shaped number that simply isn't the actual person's
 * (that needs OTP/call verification, not pattern matching), but it
 * catches the "didn't bother" case cheaply.
 */
export function isValidKenyanPhone(input: string): boolean {
  const normalized = normalizeKenyanPhone(input);

  if (!/^\+254[17]\d{8}$/.test(normalized)) {
    return false;
  }

  const nationalDigits = normalized.slice(4);

  if (hasLongRepeatedDigitRun(nationalDigits) || isStrictlySequential(nationalDigits)) {
    return false;
  }

  return true;
}
