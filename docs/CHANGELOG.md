# Changelog

A running log of notable changes to KopaAlert, kept so progress is easy to track across sessions. Newest first.

## 2026-09-12
- Added a PDF export to the Customer Management page's customer list, matching the branding/layout of the existing per-customer statement PDF, scoped to the logged-in business.
- Fixed the guided Excel import: an unedited copy of the template's sample row (row 4) is now detected and skipped instead of being imported as a real debt.

## 2026-09-11
- Rewrote the deployment checklist and maintenance runbook to match reality.
- Added PDF export for the per-customer financial statement.
- Made the customer import template a guided, locked-header Excel file (frozen header row, dropdowns for type/payment method).
- Fixed a credit utilization scoring bug and a missing React key.
- Closed race conditions in the notification cron and bulk-SMS balance checks.
- Split the notification-claim migration (an enum value can't be used in the same transaction it's created in).
- Fixed authorization and validation gaps found in a full code review.
- Only record the password-reset cooldown after a confirmed successful send.
