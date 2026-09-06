-- Finds businesses that need the day-3 renewal reminder or the day+1
-- overdue lock+final-notice, and atomically performs the mutation (marking
-- reminder-sent, or locking) in the same statement - mirrors
-- auto_blacklist_overdue_customers()'s UPDATE...RETURNING pattern.
--
-- Lock uses "< now()" rather than an exact day match so a missed cron run
-- still catches and locks the business on the next run instead of silently
-- skipping billing enforcement forever. Idempotency comes from
-- subscription_status <> 'locked' itself - once locked, excluded from all
-- future runs until a payment resets it back to 'active'.
--
-- Free-tier businesses are excluded at the SQL level (subscription_tier <>
-- 'free') - this is the authoritative guarantee that free tier is never
-- auto-locked, not something the app layer needs to re-derive.
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
