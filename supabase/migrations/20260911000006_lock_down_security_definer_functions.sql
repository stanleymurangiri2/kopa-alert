-- Recovered via a temporary audit dump (20260911000000-000002, dropped at
-- the end of this file) of every function/view/table in the public schema,
-- since several were created directly in the Supabase dashboard and were
-- never in a tracked migration - meaning their source, and in some cases
-- their existence, was invisible to this repo.
--
-- That recovery found two distinct, serious problems, both stemming from
-- Postgres's default "GRANT EXECUTE TO PUBLIC" on every new function never
-- having been revoked:
--
-- 1. create_debt_with_credit, record_customer_payment, and
--    approve_business_request had EXECUTE granted to `anon` - callable by a
--    completely unauthenticated request using only the public API key.
--    None of the three checked that the caller was authorized for what
--    they were asking to do:
--      - create_debt_with_credit trusted p_business_id outright and wrote
--        a debt for it with no check the caller belongs to that business.
--      - record_customer_payment derived the business from the debt but
--        never checked it against the caller's own business - any logged
--        in user could pay off or manipulate credit on ANY business's debt
--        by supplying its debt_id.
--      - approve_business_request had no admin check at all - anyone who
--        knew a pending business_requests id could self-approve it and
--        grant an arbitrary auth user id a business_admin role, bypassing
--        review entirely.
--
-- 2. A further ~10 functions (billing, blacklisting, ratings, audit-log
--    purging, platform diagnostics) were ALSO anon/authenticated-callable
--    despite being meant only for cron jobs or the admin API routes that
--    already call them via the service-role key. Being callable directly
--    ranged from wasteful (anyone can force-trigger a ratings recalc) to
--    destructive (anyone can wipe the audit log on demand via
--    purge_old_audit_logs, or grief every pending signup via
--    expire_stale_pending_requests).
--
-- The fix is two-layered: an explicit ownership check inside the two
-- functions where the caller's own identity is what matters (defense in
-- depth, not just relying on grants), and grants tightened everywhere to
-- only the role that's actually supposed to call each function.

-- ============================================================
-- 1. Internal ownership checks
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_debt_with_credit(
  p_business_id uuid, p_customer_id uuid, p_amount numeric, p_due_date date,
  p_description text, p_apply_credit boolean,
  p_payment_instructions text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_debt_id uuid;
  v_available numeric;
  v_credit_applied numeric := 0;
begin
  if p_business_id is distinct from public.get_current_user_business_id() then
    raise exception 'Access denied: you can only create debts for your own business.';
  end if;

  if p_amount <= 0 then
    raise exception 'Loan amount must be greater than 0.';
  end if;

  insert into debts (business_id, customer_id, amount, amount_paid, status, due_date, description, payment_instructions)
  values (p_business_id, p_customer_id, p_amount, 0, 'pending', p_due_date, p_description, p_payment_instructions)
  returning id into v_debt_id;

  insert into financial_transactions (business_id, customer_id, debt_id, type, amount, description, created_by)
  values (p_business_id, p_customer_id, v_debt_id, 'LOAN_DISBURSEMENT', p_amount, 'New loan issued', p_created_by);

  if p_apply_credit then
    select available_credit into v_available from customers where id = p_customer_id for update;
    v_credit_applied := least(coalesce(v_available, 0), p_amount);

    if v_credit_applied > 0 then
      insert into payments (business_id, debt_id, amount_paid, payment_method, notes)
      values (p_business_id, v_debt_id, v_credit_applied, 'credit', 'Applied customer credit');

      update customers set available_credit = available_credit - v_credit_applied where id = p_customer_id;

      insert into financial_transactions (business_id, customer_id, debt_id, type, amount, description, created_by)
      values (p_business_id, p_customer_id, v_debt_id, 'CREDIT_APPLIED', v_credit_applied, 'Credit applied to new loan', p_created_by);
    end if;
  end if;

  return json_build_object('debt_id', v_debt_id, 'credit_applied', v_credit_applied);
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_debt_id uuid, p_amount numeric, p_method text, p_notes text, p_created_by uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_business_id uuid;
  v_customer_id uuid;
  v_debt_amount numeric;
  v_debt_paid numeric;
  v_balance numeric;
  v_applied numeric;
  v_excess numeric;
begin
  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  select business_id, customer_id, amount, amount_paid
    into v_business_id, v_customer_id, v_debt_amount, v_debt_paid
  from debts
  where id = p_debt_id
  for update;

  if not found then
    raise exception 'Debt not found.';
  end if;

  if v_business_id is distinct from public.get_current_user_business_id() then
    raise exception 'Access denied: this debt does not belong to your business.';
  end if;

  v_balance := v_debt_amount - v_debt_paid;

  if v_balance <= 0 then
    raise exception 'This debt is already fully paid.';
  end if;

  v_applied := least(p_amount, v_balance);
  v_excess := p_amount - v_applied;

  insert into payments (business_id, debt_id, amount_paid, payment_method, notes)
  values (v_business_id, p_debt_id, v_applied, p_method, p_notes);

  insert into financial_transactions (business_id, customer_id, debt_id, type, amount, description, created_by)
  values (v_business_id, v_customer_id, p_debt_id, 'PAYMENT', p_amount, 'Payment received', p_created_by);

  if v_excess > 0 then
    update customers set available_credit = available_credit + v_excess where id = v_customer_id;

    insert into financial_transactions (business_id, customer_id, debt_id, type, amount, description, created_by)
    values (v_business_id, v_customer_id, p_debt_id, 'CREDIT_CREATED', v_excess, 'Overpayment credit created', p_created_by);
  end if;

  return json_build_object('applied', v_applied, 'excess', v_excess);
end;
$function$;

-- ============================================================
-- 2. Grants - revoke the accidental PUBLIC/anon defaults, keep only what
--    each function's real caller needs.
-- ============================================================

-- Called by an authenticated business user via the client SDK - needs
-- `authenticated`, not `anon`.
REVOKE ALL ON FUNCTION public.create_debt_with_credit(uuid, uuid, numeric, date, text, boolean, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_customer_payment(uuid, numeric, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_customer_transactions(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_debt_with_credit(uuid, uuid, numeric, date, text, boolean, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid, numeric, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_customer_transactions(jsonb) TO authenticated;

-- Called only via the service-role key (admin API routes or Vercel cron,
-- both already gate access before reaching these) - no authenticated/anon
-- role has any legitimate reason to call these directly.
REVOKE ALL ON FUNCTION public.approve_business_request(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_pending_requests(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_old_audit_logs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_subscription_billing_cycle() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_blacklist_overdue_customers() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_customer_ratings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_daily_reminders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_sms_balance(uuid) FROM PUBLIC, anon, authenticated;

-- Unused by any current code path (platform diagnostics) - same treatment.
REVOKE ALL ON FUNCTION public.verify_database_integrity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_security_compliance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_tenant_daily_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.approve_business_request(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_pending_requests(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_old_audit_logs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_subscription_billing_cycle() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_blacklist_overdue_customers() TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_customer_ratings() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_daily_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_sms_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_database_integrity() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_security_compliance() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_daily_metrics(uuid, timestamptz, timestamptz) TO service_role;

-- ============================================================
-- 3. Drop the temporary audit-dump table now that it's been read.
-- ============================================================
DROP TABLE IF EXISTS public._schema_audit_dump;
