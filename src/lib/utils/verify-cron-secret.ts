import { timingSafeEqual } from 'crypto';

/**
 * Fails CLOSED: with no CRON_SECRET configured, every request is rejected
 * rather than every request being let through. A previous version failed
 * open (`if (cronSecret && authHeader !== ...)`), which meant an unset env
 * var silently turned these into public, unauthenticated endpoints -
 * including one that purges audit logs and one that runs subscription
 * billing.
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || !authHeader) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
