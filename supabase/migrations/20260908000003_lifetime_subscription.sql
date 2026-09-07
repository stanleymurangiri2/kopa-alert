-- Adds a "lifetime" subscription tier for one-time-purchase businesses that
-- never bill again: subscription_tier = 'lifetime', subscription_expires_at
-- left NULL. Excludes them from the billing cron the same way 'free' tier
-- already is, so they're never reminded or auto-locked.
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
  WHERE b.subscription_tier NOT IN ('free', 'lifetime')
    AND b.subscription_status <> 'locked'
    AND b.subscription_expires_at IS NOT NULL
    AND b.subscription_expires_at < now()
  RETURNING b.id, b.business_name, b.email, 'locked', b.subscription_expires_at, b.subscription_price;

  RETURN QUERY
  UPDATE public.businesses b
  SET subscription_reminder_sent_at = now()
  WHERE b.subscription_tier NOT IN ('free', 'lifetime')
    AND b.subscription_status <> 'locked'
    AND b.subscription_expires_at IS NOT NULL
    AND b.subscription_expires_at > now()
    AND b.subscription_expires_at <= now() + INTERVAL '3 days'
    AND b.subscription_reminder_sent_at IS NULL
  RETURNING b.id, b.business_name, b.email, 'reminder', b.subscription_expires_at, b.subscription_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
