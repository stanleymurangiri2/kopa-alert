-- Simple key/value store for platform-wide admin settings, backing the
-- "Approval Rules" and "Audit Log Retention" sections on /admin/settings
-- (previously static "Coming soon" placeholders).
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id)
);

INSERT INTO public.platform_settings (key, value)
VALUES
  ('resend_limit', '3'::jsonb),
  ('pending_request_auto_expire_days', 'null'::jsonb),
  ('audit_log_retention_days', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Rejects any business_requests still 'pending' after p_days days, so a
-- forgotten registration doesn't sit unreviewed forever. Returns the
-- affected rows so the caller can email each applicant, mirroring the
-- auto_blacklist_overdue_customers()/process_subscription_billing_cycle()
-- act-then-report pattern already used in this codebase.
CREATE OR REPLACE FUNCTION public.expire_stale_pending_requests(p_days INT)
RETURNS TABLE(out_id UUID, out_business_name TEXT, out_owner_name TEXT, out_email TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.business_requests br
  SET status = 'rejected'
  WHERE br.status = 'pending'
    AND br.created_at < now() - (p_days || ' days')::interval
  RETURNING br.id, br.business_name, br.owner_name, br.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletes audit_logs older than p_days days. Returns the number of rows
-- removed so the cron can log its own summary (the summary entry is
-- inserted after this runs, so it survives this same purge pass).
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs(p_days INT)
RETURNS INTEGER AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
