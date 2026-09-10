-- Several tables were created (directly in the dashboard, outside tracked
-- migrations) without Row Level Security, leaving them fully readable by
-- anyone on the internet with just the public anon key - no login required.
-- Verified live: an unauthenticated request returned all rows of
-- audit_logs (admin actions, business names, user ids), platform_settings,
-- and - the worst of these - `notifications`, a legacy table holding a
-- real customer's phone number and reminder message text in plain view.
--
-- `audit_logs` turned out to be a VIEW (ALTER ... ENABLE ROW LEVEL SECURITY
-- fails on views), backed by a real table, `activity_logs`, with identical
-- columns. activity_logs already had RLS and a super_admin policy set up
-- (outside migrations) - which confirms the actual bug precisely: the view
-- wasn't honoring it, because views default to running with their owner's
-- (bypassing) privileges unless security_invoker is set. That's the real
-- fix here; the rest of this migration is catching up the repo's tracked
-- state and closing the same gap on siblings discovered during this pass.
--
-- Every current reader/writer of every table touched here already goes
-- through the service-role client (bypasses RLS, unaffected) or a session
-- already gated to super_admin by /admin's layout, so locking these down
-- matches how they're actually used today - nothing legitimate breaks.

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin access all activity logs" ON public.activity_logs;
CREATE POLICY "Super Admin access all activity logs" ON public.activity_logs
FOR ALL USING (public.get_current_user_role() = 'super_admin')
WITH CHECK (public.get_current_user_role() = 'super_admin');

ALTER VIEW public.audit_logs SET (security_invoker = on);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin access all platform settings" ON public.platform_settings;
CREATE POLICY "Super Admin access all platform settings" ON public.platform_settings
FOR ALL USING (public.get_current_user_role() = 'super_admin')
WITH CHECK (public.get_current_user_role() = 'super_admin');

-- `notifications` (distinct from notification_queue, contains real
-- recipient phone numbers and message text) is ALSO a view, not a table -
-- RLS policies can't be attached to it directly, and its true base table
-- isn't identifiable from this session (no raw SQL access to inspect the
-- view definition). security_invoker is the safe fix available here: it
-- can only make the view MORE restrictive by deferring to whatever RLS
-- its base table has, never less. Whoever has SQL editor access should
-- run `\d+ notifications` (or check its definition in the dashboard) to
-- confirm the base table itself has RLS - this migration can't verify that
-- part.
ALTER VIEW public.notifications SET (security_invoker = on);

-- Contains M-Pesa references and phone numbers - same scoping as payments.
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin access all subscription payments" ON public.subscription_payments;
CREATE POLICY "Super Admin access all subscription payments" ON public.subscription_payments
FOR ALL USING (public.get_current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users access own business subscription payments" ON public.subscription_payments;
CREATE POLICY "Users access own business subscription payments" ON public.subscription_payments
FOR ALL USING (business_id = public.get_current_user_business_id())
WITH CHECK (business_id = public.get_current_user_business_id());

-- Internal error log with stack traces - super_admin only, no business use.
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin access all system errors" ON public.system_errors;
CREATE POLICY "Super Admin access all system errors" ON public.system_errors
FOR ALL USING (public.get_current_user_role() = 'super_admin');

-- Unused by any current code path - locked to super_admin as the safe
-- default until this feature is actually built out.
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin access all notices" ON public.notices;
CREATE POLICY "Super Admin access all notices" ON public.notices
FOR ALL USING (public.get_current_user_role() = 'super_admin')
WITH CHECK (public.get_current_user_role() = 'super_admin');
