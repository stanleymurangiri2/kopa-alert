-- Subscription billing: businesses columns.
-- subscription_tier/subscription_status/subscription_expires_at already exist
-- live (schema drift, not in tracked migrations) but are pure display fields
-- today, never branched on anywhere. This adds what's needed to actually run
-- a billing cycle: a per-business price, and timestamps to make the reminder/
-- lock cron idempotent per cycle.
ALTER TABLE IF EXISTS public.businesses
  ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10,2) NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS subscription_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_final_notice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_last_payment_at TIMESTAMPTZ;

COMMENT ON COLUMN public.businesses.subscription_price IS
  'Standing monthly price in KES for this business''s paid subscription. Inert while subscription_tier = ''free''. Defaults to 1500, editable per-business when recording a payment.';
COMMENT ON COLUMN public.businesses.subscription_reminder_sent_at IS
  'Timestamp the day-3 renewal reminder was sent for the CURRENT billing cycle. Reset to NULL whenever a payment is recorded (new cycle starts).';
COMMENT ON COLUMN public.businesses.subscription_final_notice_sent_at IS
  'Timestamp the day+1 overdue final-notice/lock email was sent for the CURRENT cycle. Reset to NULL on payment.';

-- Repurpose subscription_payments (exists live, previously modeled a
-- business-self-reports-Pochi-payment flow) for admin-recorded payments by
-- any method. mpesa_reference/sender_phone become optional free-text fields
-- rather than required M-Pesa-only data.
ALTER TABLE IF EXISTS public.subscription_payments
  ALTER COLUMN mpesa_reference DROP NOT NULL,
  ALTER COLUMN sender_phone DROP NOT NULL;

ALTER TABLE IF EXISTS public.subscription_payments
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.users(id);

COMMENT ON COLUMN public.subscription_payments.mpesa_reference IS
  'Optional free-text payment reference (M-Pesa code, bank slip #, etc.) for any payment_method - nullable since admin-recorded cash payments may have none.';
COMMENT ON COLUMN public.subscription_payments.sender_phone IS
  'Optional sender phone, kept nullable for non-mobile-money payment methods.';
