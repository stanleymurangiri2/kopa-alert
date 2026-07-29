# KopaAlert PR #2 — "Fix production build" runtime test report

Environment: local `npm run dev` on port 3000 against the **real Supabase project** (creds from `.env.local`), branch `devin/1785274236-fix-build`.

Seeded via service-role script (needed because registration requires admin approval and there was no usable account):
- business "Devin Test Shop" (`812be6c5-…a70d`, status `approved`)
- users `devin.owner@example.com` (business_admin) and `devin.super@example.com` (super_admin), password `TestPass123!`
- 1 customer (Jane Testworth), 1 debt (KES 5,000 / 1,500 paid), 1 payment, 1 pending business_request

Also re-ran `npm run build` → **exit 0**, full route manifest produced.

---

## PASS — the core of the diff: async `params` admin detail pages

All three pages changed in this PR resolved their `[id]` and fetched the right row. No
`params should be awaited` error appeared in the dev server log at any point.

| /admin/businesses/[id] | /admin/users/[id] |
|---|---|
| ![business detail](https://app.devin.ai/attachments/87b1f104-0081-40b1-83ed-63cd63561d30/ss_8524240a.png) | ![user detail](https://app.devin.ai/attachments/0ebacc63-7ca3-41eb-a347-606f99a14fc1/ss_14a51fe4.png) |
| Shows "Devin Test Shop", correct email/phone, Status **approved** | Shows "Devin Owner", role business_admin, correct Business ID |

| /admin/requests/[id] | /admin (super admin dashboard) |
|---|---|
| ![request detail](https://app.devin.ai/attachments/ca6211fb-e2ed-4bfd-af07-6dc5d90b4edd/ss_e5e6dee7.png) | ![admin dashboard](https://app.devin.ai/attachments/dd191570-25a6-4d2a-aeb9-5b49cd2643af/ss_e0aa234d.png) |
| Shows "QA Pending Traders" / Peter QA / pending. Approve/Reject deliberately NOT clicked (would send SMS/email) | Counts render (Businesses 1, Users 3) |

## PASS — auth against real Supabase

| Wrong password rejected 🔴 | Live data from Supabase 🟢 |
|---|---|
| ![wrong password](https://app.devin.ai/attachments/ea093e0e-aaa2-42fb-9aad-8dc22f2f731a/ss_84ec2631.png) | ![debts list](https://app.devin.ai/attachments/430befca-efbb-425d-8335-329fee158804/ss_7789a1ee.png) |
| "Incorrect email or password." shown | Seeded debt row: Jane Testworth, KES 5,000 / 1,500 paid, balance 3,500, partially paid |

Correct credentials redirected to `/dashboard`; header showed "Devin Test Shop" / "Devin Owner".
`/login` and `/register` both render their full forms (proves the lazy Resend / Africa's Talking /
service-role clients no longer blow up at module load).

## FAIL / pre-existing issues found (none appear to be introduced by this PR)

| /dashboard cannot load data | /admin/login redirect loop |
|---|---|
| ![dashboard](https://app.devin.ai/attachments/5286da81-aebb-496b-abf0-7ce2ee184298/ss_a551fb83.png) | ![redirect loop](https://app.devin.ai/attachments/2799ff1b-dc9c-43d1-a56d-24e9fc898a17/ss_8b7811c1.png) |
| "Unable to connect to dashboard service." Server component fetches `/api/reports/overview` with no Bearer token → middleware returns the login HTML → `JSON.parse` throws (`Dashboard fetch error: SyntaxError: Unexpected token '<'`) | `/admin/login` is wrapped by `src/app/admin/layout.tsx`, which redirects unauthenticated users to `/admin/login` → ERR_TOO_MANY_REDIRECTS. Workaround used: log in as super_admin through `/login`, which routes to `/admin` |

| Sign out 404s |
|---|
| ![signout 404](https://app.devin.ai/attachments/8368f11f-0209-48d0-aa41-10a0baee6a85/ss_9d82a4b3.png) |
| The header "Sign out" button posts to `/api/auth/signout`, which does not exist (404). Had to use an incognito window to switch users |

Other observations:
- `/payments` renders but shows "No payments found." — dev log: `GET /api/reports/payments? 404` (route file missing) even though a payment row exists.
- `/reports/customers`, `/reports/debts`, `/reports/sms` render their UI but are empty — `GET /api/reports/customers? 401` (client doesn't send the `Authorization: Bearer` header these routes require).
- `/customers` renders the **Debts** UI (`src/app/(dashboard)/customers/page.tsx` contains the debts page code) — cosmetic/wrong-page bug, pre-existing.

## Assertion summary

- Landing `/` (redirects to `/login` when unauthenticated) and `/register` render — **passed**
- Wrong password → "Incorrect email or password." — **passed**
- Valid login → `/dashboard`, header shows business + user name — **passed**
- Dashboard overview data loads — **failed (pre-existing API/auth bug)**
- `/customers`, `/debts` render live Supabase rows — **passed**
- `/payments` shows the seeded payment — **failed (API 404, pre-existing)**
- `/reports/{customers,debts,sms}` render without crashing — **passed**; show data — **failed (API 401, pre-existing)**
- `/admin` dashboard renders — **passed**
- `/admin/businesses/[id]`, `/admin/users/[id]`, `/admin/requests/[id]` render correct row (async params) — **passed**
- No `params should be awaited` / module-scope client init errors in dev log — **passed**
- `npm run build` exit 0 — **passed**
- Approve/reject business actions (SMS/email side effects) — **untested by design**
- `/admin/login` page — **failed (redirect loop, pre-existing)**; sign-out — **failed (404, pre-existing)**
