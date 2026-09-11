# 🛡️ Post-Launch Maintenance & Incident Response

Reflects the actual current stack: **Vercel** (hosting, cron, logs — not Netlify), **Supabase** (Postgres/Auth), **Resend** (email), **Africa's Talking** (SMS).

## 1. Where to Look

| Signal | Where |
|---|---|
| Server errors, API route 5xx rates, cron run logs | Vercel → Project → Logs (or `vercel logs <deployment-url>`) |
| Database CPU/connections/storage, slow queries | Supabase Dashboard → Project → Database |
| Cron job history & duration | Vercel → Project → Cron (there is no `pg_cron` in this project — cron jobs are plain Vercel-scheduled hits on `/api/cron/*` routes, see `vercel.json`) |
| SMS delivery rate, failed status codes, wallet balance | Africa's Talking Dashboard |
| Email delivery, bounces, spam complaints | Resend Dashboard |
| Real SPF/DKIM/DMARC pass rate, domain reputation | Google Postmaster Tools (must have the domain added *and verified* — the Resend dashboard alone doesn't show this) |
| In-app audit trail of admin/business actions | `audit_logs` (a view over the real table `activity_logs`), queryable from the Supabase dashboard or `/admin` → relevant list pages |

## 2. Common Incident Protocols

### Incident A: SMS Reminders Not Going Out

1. Check `notification_queue` for a backlog in `status = 'pending'` (not `sms_queue` — that table name doesn't exist in this schema) or rows stuck in `'processing'`.
2. Check the `/api/cron/notifications` run in Vercel → Cron — did it actually fire on schedule (`0 6 * * *` UTC), and did it return 200?
3. If it's returning 401, `CRON_SECRET` is likely unset or wrong in Vercel env vars — `verify-cron-secret.ts` fails closed, so a misconfigured secret silently stops the whole job rather than letting requests through.
4. Check Africa's Talking wallet balance and the business's own `sms_balance` on the `businesses` table — either can independently block sends.
5. A row stuck in `'processing'` for a long time usually means a crashed/timed-out run; `claim_notification_batch()` automatically reclaims anything stuck longer than 10 minutes on the next run, so this should self-heal — if it doesn't, check for an error in that cron's logs.

### Incident B: Bulk SMS Rejected as "Insufficient Balance" Unexpectedly

The bulk-SMS route (`/api/notifications/bulk-sms`) reserves the full recipient count atomically via `reserve_sms_balance()` before sending, then refunds any unreserved portion (missing phone numbers, failed sends) via `refund_sms_balance()`. If a business reports their balance looks wrong:
1. Check `businesses.sms_balance` directly.
2. Check recent `audit_logs` entries with `action = 'SEND_BULK_SMS'` for that business to see what was actually reserved/sent/refunded.
3. A refund only fires if the *reserve* succeeded first — if the reserve itself failed (insufficient balance), nothing was ever deducted, so there's nothing to refund.

### Incident C: A Specific Business Reports "Emails Not Arriving"

This has been the single most time-consuming class of incident in this app's history — work through these in order, verifying each with a real test send before moving to the next, not by assumption:

1. **Is `sendEmail()`'s result actually being checked at the call site?** It never throws — it returns `{ success: false, error }` on failure. Every call site in this codebase now checks the result (fixed 2026-09-11), but if a new email call site is added later without checking it, a real send failure will silently report success.
2. **Is the link in the email on the app's own domain?** Any Supabase-generated link (`action_link`) points at the raw `*.supabase.co` project URL by default — that's a deliverability red flag on its own. Templates should build a same-domain link using the `hashed_token` field instead (see `src/app/api/auth/forgot-password/route.ts` for the pattern).
3. **Is DNS actually correct right now?** Check SPF (`v=spf1 include:amazonses.com ~all`) and that there's exactly one `_dmarc.<domain>` record, via `nslookup`/`dig` against a public resolver (8.8.8.8), not just what the DNS provider's dashboard claims is saved. Cross-check against Google Postmaster Tools' real pass-rate numbers.
4. **Is the template's content itself getting filtered?** Even with fully correct DNS and domain, Gmail (and others) can still classify a specific template as suspicious based on its content — subject lines combining sensitive words ("password" + "reset"), urgency boilerplate, and styled CTA buttons all read like phishing-kit patterns. Prove this by sending two emails through the identical pipeline in the same minute to the same recipient — one using the suspect template, one using a template already known to deliver (e.g. the approval email) — and see if only one arrives.
5. **Rapid repeated sends to the same recipient** can themselves trigger spam/abuse filtering on a low-reputation or newly-verified domain, independent of all of the above — if several sends were fired in quick succession while debugging, wait and retest with a single isolated send before concluding anything is still broken.

### Incident D: Credit Limit / Risk Assessment Looks Wrong

- The scorer (`src/lib/credit/scoring.ts`) is a pure, deterministic rule-based function (no ML model yet — that's Phase 2, not built). Given the same `CreditFeatures` input it will always produce the same output, so a "wrong-looking" score is almost always either a feature-extraction bug (`src/lib/credit/features.ts`) or a stale cached assessment, not scorer randomness.
- `/api/credit/latest` lazily recalculates when the cached assessment is stale — check `credit_assessments.created_at` against the customer's most recent debt/payment activity, and whether the assessment is already `applied` (an applied assessment is always treated as stale, since applying itself changes the field the cached row snapshotted).
- A customer with `creditUtilization = null` in a stored assessment means their current limit was 0 (frozen) at assessment time — that's a valid state, not a bug, and is deliberately scored as worst-case if they have any outstanding balance.

### Incident E: Suspected Race Condition / Double-Send

Two known race conditions were found and fixed 2026-09-12 (`claim_notification_batch()` for the notification cron, `reserve_sms_balance()`/`refund_sms_balance()` for bulk SMS) — both now use a single atomic `UPDATE ... RETURNING` or `SELECT ... FOR UPDATE` rather than read-then-act. If a new double-processing report comes in against either of those flows, check whether the deployed code actually matches `origin/main` (an old deployment predating the fix would still have the bug) before assuming a new root cause. Verified live under real concurrent load at the time of the fix — see the migration files' own comments (`supabase/migrations/20260912000003_atomic_notification_claim.sql`, `20260912000005_atomic_notification_claim_fn.sql`, `20260912000004_atomic_sms_balance_reserve.sql`) for the exact mechanism.

## 3. Local Verification Tools

- `npm run preflight` — checks core Supabase env vars are present and the service-role key can reach the database. Doesn't check email/SMS credentials or `CRON_SECRET`.
- `npm test` (Jest) — unit tests for pure logic (credit scoring/features, SMS message templating). No database or network calls.
- `npm run test:e2e` (Playwright) — end-to-end browser tests.
- `npx supabase migration list --linked` — confirms local migration files match what's actually applied to the linked remote database; a mismatch here means someone applied SQL by hand outside the migrations folder, or a migration failed partway.
