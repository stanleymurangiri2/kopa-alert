---
name: testing-kopa-alert
description: How to set up and end-to-end test the KopaAlert Next.js 15 + Supabase app locally (seeding accounts, reaching dashboard and super-admin pages, known broken routes).
---

# Testing KopaAlert locally

## Run it
- `npm install`, then `npm run dev` (port 3000). Real creds live in `.env.local`
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `AT_API_KEY`, `NEXT_PUBLIC_APP_URL`). See "Devin Secrets Needed" below.
- `npm run build` should exit 0.

## You cannot self-register a usable account
`/register` only creates an auth user with password `TEMP_PASSWORD` and expects a super admin to
approve the business, so seed accounts directly with the service-role key instead.

- Node 20 breaks `@supabase/supabase-js` (`native WebSocket not found`). Use
  `~/.nvm/versions/node/v22.12.0/bin/node`, and run the script from inside the repo so
  `@supabase/supabase-js` resolves.
- Seed order: insert into `businesses` (`business_name, phone, email, status:'approved'`) →
  `supabase.auth.admin.createUser({email, password, email_confirm:true})` →
  upsert `users` row (`id, business_id, role, name, email`; role enum:
  `super_admin | business_admin | employee`).
- For visible data: `customers` (business_id, full_name, phone) → `debts`
  (business_id, customer_id, amount, amount_paid, description, due_date, status) → `payments`
  (business_id, debt_id, amount_paid, payment_method). For admin request pages insert into
  `business_requests` (business_name, owner_name, phone, email, status:'pending').
- Delete any temp seed script from the repo before finishing (`git status` should be clean).

## Reaching the UI
- Log in at `/login`. Role decides destination: `super_admin` → `/admin`, `business_admin` →
  `/business`, else `/dashboard`.
- Do **not** use `/admin/login`: it is wrapped by `src/app/admin/layout.tsx`, which redirects
  unauthenticated users back to it (ERR_TOO_MANY_REDIRECTS). Log in as the super_admin via
  `/login` instead.
- The header "Sign out" posts to `/api/auth/signout`, which may not exist (404). To switch users,
  use a fresh incognito window rather than signing out.
- Admin detail pages have no link from every list; navigating directly to
  `/admin/businesses/<id>`, `/admin/users/<id>`, `/admin/requests/<id>` works.
- Never click Approve/Reject on a business request during testing — it triggers SMS (Africa's
  Talking) and email (Resend) side effects.

## Known-broken areas (may still be broken; don't mistake them for regressions)
- `/dashboard` server component fetches `/api/reports/overview` without an `Authorization: Bearer`
  header; middleware returns login HTML, so the page shows
  "Unable to connect to dashboard service."
- `/payments` calls `/api/reports/payments`, which may 404 (route file missing).
- `/reports/{customers,debts,sms}` render but their APIs return 401 for the same missing-Bearer
  reason, so tables show "No … found."
- `/customers` currently renders the Debts page UI.
- Check `dev` server stdout for `params should be awaited` and `Dashboard fetch error` lines — the
  log is the fastest way to distinguish a real runtime error from an empty-but-healthy page.

## Devin Secrets Needed
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  (service role is required to seed approved businesses/users).
- `AT_API_KEY` (Africa's Talking) and any Resend key only if you intend to exercise SMS/email —
  avoid in normal testing.
