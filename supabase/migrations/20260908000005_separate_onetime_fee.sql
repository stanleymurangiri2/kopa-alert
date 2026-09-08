-- Separates the one-time system fee from the recurring monthly subscription.
-- Previously a one-time payment set subscription_tier = 'lifetime', which
-- zeroed subscription_price and permanently excluded the business from the
-- monthly billing/locking cron. That conflated two independent charges: the
-- one-time fee is for the right to use the system at all, while the monthly
-- fee is separate and ongoing (maintenance, SMS, etc). A business that has
-- paid the one-time fee must still be billed monthly and can still be locked
-- for non-payment of the monthly fee.
ALTER TABLE IF EXISTS public.businesses
  ADD COLUMN IF NOT EXISTS onetime_fee_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onetime_fee_amount NUMERIC(10,2);

COMMENT ON COLUMN public.businesses.onetime_fee_paid_at IS
  'When the one-time system/activation fee was paid. NULL means unpaid - non-super-admin dashboard access is gated on this being set. Independent of subscription_tier/status, which track the separate recurring monthly fee.';
COMMENT ON COLUMN public.businesses.onetime_fee_amount IS
  'Amount paid for the one-time system fee, for display purposes.';

-- Grandfather every business that already exists as of this migration so the
-- new dashboard gate (added in application code) never locks out a business
-- already actively using the system. Only businesses created after this
-- migration start with onetime_fee_paid_at NULL and are actually gated.
UPDATE public.businesses
SET onetime_fee_paid_at = COALESCE(created_at, now())
WHERE onetime_fee_paid_at IS NULL;

-- Businesses previously marked 'lifetime' under the old model: pull whatever
-- one-time amount they paid (if recorded) into onetime_fee_amount, then put
-- them back on normal monthly billing with a fresh 30-day cycle so they
-- resume being billed/locked like any other paid business.
UPDATE public.businesses b
SET onetime_fee_amount = sp.amount
FROM (
  SELECT DISTINCT ON (business_id) business_id, amount
  FROM public.subscription_payments
  WHERE payment_type = 'one_time'
  ORDER BY business_id, created_at DESC
) sp
WHERE b.id = sp.business_id
  AND b.subscription_tier = 'lifetime';

UPDATE public.businesses
SET subscription_tier = 'paid',
    subscription_status = 'active',
    subscription_price = 1500,
    subscription_expires_at = now() + INTERVAL '30 days',
    subscription_locked_at = NULL,
    subscription_reminder_sent_at = NULL,
    subscription_final_notice_sent_at = NULL
WHERE subscription_tier = 'lifetime';

-- Restore the billing cycle function to only exempt 'free' tier - the
-- 'lifetime' exemption from 20260908000003_lifetime_subscription.sql no
-- longer applies now that 'lifetime' isn't a distinct billing state.
CREATE OR REPLACE FUNCTION public.process_subscription_billing_cycle()
RETURNS TABLE(
  out_business_id UUID,
  out_business_name TEXT,
  out_email TEXT,
  out_action TEXT,               -- 'locked' | 'reminder'
  out_subscription_expires_at TIMESTAMPTZ,
  out_subscription_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.businesses b
  SET subscription_status = 'locked',
      subscription_locked_at = now(),
      subscription_final_notice_sent_at = now()
  WHERE b.subscription_tier <> 'free'
    AND b.subscription_status <> 'locked'
    AND b.subscription_expires_at IS NOT NULL
    AND b.subscription_expires_at < now()
  RETURNING b.id, b.business_name, b.email, 'locked', b.subscription_expires_at, b.subscription_price;

  RETURN QUERY
  UPDATE public.businesses b
  SET subscription_reminder_sent_at = now()
  WHERE b.subscription_tier <> 'free'
    AND b.subscription_status <> 'locked'
    AND b.subscription_expires_at IS NOT NULL
    AND b.subscription_expires_at > now()
    AND b.subscription_expires_at <= now() + INTERVAL '3 days'
    AND b.subscription_reminder_sent_at IS NULL
  RETURNING b.id, b.business_name, b.email, 'reminder', b.subscription_expires_at, b.subscription_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
