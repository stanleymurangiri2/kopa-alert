# 🚀 KopaAlert Production Go-Live Checklist

Reflects the actual current stack: **Vercel** (hosting, cron), **Supabase** (Postgres + Auth + RLS), **Resend** (email, AWS SES-backed), **Africa's Talking** (SMS). There are no Supabase Edge Functions or `pg_cron` jobs in this project — all scheduled work runs as Next.js API routes under `src/app/api/cron/`, triggered by Vercel Cron.

## 1. Supabase

- [ ] Apply every migration under `supabase/migrations/` to the target project:
  ```bash
  npx supabase link --project-ref <project-ref>
  npx supabase db push --linked
  ```
  Do **not** hand-paste SQL into the dashboard SQL editor — the migrations folder is the source of truth, and several past incidents (schema drift on `businesses`, an enum-value-in-same-transaction failure) came from bypassing it. Confirm the push actually landed with `npx supabase migration list --linked` (local and remote timestamps should match exactly).
- [ ] A newly added enum value (`ALTER TYPE ... ADD VALUE`) can't be referenced by name in the same transaction/migration that adds it — if a migration needs to do both, split it into two files with the enum-add migration timestamped earlier.
- [ ] The Supabase CLI silently skips any migration file whose name isn't a plain numeric timestamp prefix (`YYYYMMDDHHMMSS_name.sql`) — no warning beyond a one-line "Skipping migration..." in the push output. Read the CLI output, don't just check the exit code.
- [ ] Verify Row Level Security is enabled on every application table — `businesses`, `users`, `customers`, `debts`, `payments`, `notification_queue`, `notification_templates`, `platform_notification_templates`, `business_requests`, `business_settings`, `subscription_payments`, `credit_assessments`, `activity_logs` (the real table backing the `audit_logs` view), `platform_settings`, `notices`, `system_errors`. Several of these were found *missing* RLS during the 2026-09-11 security audit — don't assume a table already has it just because its siblings do.
- [ ] Confirm no privileged Postgres function is still executable by `PUBLIC`/`anon`/`authenticated` by accident (Postgres grants `EXECUTE` to `PUBLIC` by default on every new function). Spot-check with:
  ```sql
  SELECT proname FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE');
  ```
  Every `SECURITY DEFINER` function that isn't meant to be called directly by a client should have been explicitly `REVOKE`d (see `supabase/migrations/20260911000006_lock_down_security_definer_functions.sql` for the pattern).

## 2. Environment Variables (Vercel Project Settings → Environment Variables)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only, bypasses RLS — never expose to the client |
| `NEXT_PUBLIC_APP_URL` | Canonical app origin (`https://www.kopaalert.shop`); used to build same-domain email links |
| `RESEND_API_KEY` | Email sending |
| `AT_USERNAME`, `AT_API_KEY` | Africa's Talking SMS |
| `CRON_SECRET` | Shared secret Vercel Cron sends as `Authorization: Bearer <secret>`. `src/lib/utils/verify-cron-secret.ts` **fails closed** — if this is unset, every cron route rejects every request rather than accepting all of them, so a missing value here breaks reminders/billing/reassessment silently rather than leaving them open. Confirm it's actually set before relying on any cron job. |

Run `npm run preflight` (`scripts/preflight_check.ts`) before a deploy — it checks the Supabase-related env vars are present and that the service-role key can actually reach the `businesses` table. It does not check `CRON_SECRET`, `RESEND_API_KEY`, or the Africa's Talking sender ID, so those still need a manual look.

## 3. Vercel Cron Jobs

Defined in `vercel.json` — six jobs, each hitting an `/api/cron/*` route:

| Path | Schedule (UTC) | Purpose |
|---|---|---|
| `/api/cron/notifications` | `0 6 * * *` | Sends due SMS/WhatsApp reminders via `claim_notification_batch()` |
| `/api/cron/auto-blacklist` | `30 6 * * *` | Auto-blacklists customers past the configured overdue threshold |
| `/api/cron/credit-reassessment` | `15 7 * * *` | Sweeps stale/missing credit assessments (Phase 1 credit-limit engine) |
| `/api/cron/subscription-billing` | `0 7 * * *` | Runs business subscription billing |
| `/api/cron/ratings` | `0 1 1 * *` | Monthly customer rating recalculation |
| `/api/cron/platform-maintenance` | `0 5 * * *` | Housekeeping sweep (expired requests, stale sessions, etc.) |

- [ ] After a deploy, check Vercel → Project → Cron to confirm all six are registered and enabled (a `vercel.json` change to the cron list only takes effect on the next production deploy).
- [ ] Manually curl one route with the real `CRON_SECRET` after a first deploy to confirm the auth check passes:
  ```bash
  curl -X POST https://www.kopaalert.shop/api/cron/notifications \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

## 4. Domain, DNS & Email Deliverability

This app has hit real production email-delivery incidents from DNS misconfiguration — don't skip this section on a domain change.

- [ ] SPF record on the sending domain authorizes Resend's AWS SES infrastructure: `v=spf1 include:amazonses.com ~all`. A record like `v=spf1 -all` authorizes *zero* senders and silently fails every send.
- [ ] Exactly **one** `_dmarc.<domain>` TXT record exists — two conflicting DMARC records (e.g. `p=reject` and `p=none` simultaneously) are invalid per spec and can cause inconsistent handling by receiving mail servers.
- [ ] Domain is added *and verified* in Google Postmaster Tools — this is the only reliable way to see real SPF/DKIM/DMARC pass rates and reputation for the sending domain; the Resend dashboard alone won't show this.
- [ ] Any email template with a link must point at the app's own domain (`NEXT_PUBLIC_APP_URL`), never a raw Supabase project URL — an off-domain auth link is itself a deliverability/trust red flag to spam filters, independent of DNS correctness.
- [ ] Keep transactional email copy free of urgency/phishing-pattern language (subject lines combining words like "password" + "reset", styled CTA buttons, boilerplate urgency) — this measurably affects inbox placement even with fully correct DNS.

## 5. Post-Deploy Smoke Test

- [ ] Sign up / log in as each role (`employee`, `business_admin`, `super_admin`) and confirm no unexpected redirect loop.
- [ ] Trigger the forgot-password flow end-to-end with a real inbox and confirm the email arrives and the reset link works.
- [ ] Send one manual SMS reminder and one bulk-SMS batch; confirm the business's SMS balance debits correctly and doesn't go negative.
- [ ] Open a customer with real debt history and confirm the Credit/Risk card renders (or shows `INSUFFICIENT_DATA` for a customer with none) — this depends on the `credit_assessments` table and its RLS policies matching the deploy.
