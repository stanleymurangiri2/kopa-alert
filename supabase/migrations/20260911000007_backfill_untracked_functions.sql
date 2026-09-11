-- Source recovered from the live database via the temporary audit dump in
-- 20260911000000-000002 (already dropped). These functions existed and
-- were in active use but had no tracked migration defining them - this
-- file is documentation/disaster-recovery, not a behavior change; each
-- CREATE OR REPLACE matches what was already live.

-- Tenant-isolation guards, already attached as BEFORE INSERT triggers on
-- debts/payments (verified in the same audit pass) - a debt or payment row
-- whose customer_id/debt_id doesn't actually belong to the stated
-- business_id is rejected at the database level regardless of which code
-- path tried to insert it.
CREATE OR REPLACE FUNCTION public.verify_debt_customer_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_customer_biz UUID;
BEGIN
    SELECT business_id INTO v_customer_biz FROM public.customers WHERE id = NEW.customer_id;
    IF v_customer_biz IS NULL OR v_customer_biz != NEW.business_id THEN
        RAISE EXCEPTION 'Security Error: Customer does not belong to the target business.';
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_payment_debt_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_debt_biz UUID;
BEGIN
    SELECT business_id INTO v_debt_biz FROM public.debts WHERE id = NEW.debt_id;
    IF v_debt_biz IS NULL OR v_debt_biz != NEW.business_id THEN
        RAISE EXCEPTION 'Security Error: Debt record does not belong to the target business.';
    END IF;
    RETURN NEW;
END;
$function$;

-- Fires on debt creation to queue the "you've taken a debt" SMS.
CREATE OR REPLACE FUNCTION public.queue_debt_created_sms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_customer RECORD;
  v_business RECORD;
  v_msg TEXT;
BEGIN
  SELECT full_name, phone INTO v_customer FROM customers WHERE id = NEW.customer_id;
  SELECT business_name INTO v_business FROM businesses WHERE id = NEW.business_id;

  v_msg := 'Dear ' || v_customer.full_name || ', you have taken a debt of KES ' || NEW.amount ||
           ' for "' || NEW.description || '" with ' || v_business.business_name ||
           '. Payable by ' || NEW.due_date || '. Please pay on time to increase your limit.';

  INSERT INTO notification_queue (business_id, debt_id, customer_id, channel, recipient_phone, message_body, scheduled_for, status)
  VALUES (NEW.business_id, NEW.id, NEW.customer_id, 'sms', v_customer.phone, v_msg, NOW(), 'pending');

  RETURN NEW;
END;
$function$;

-- Generates the human-facing "KPA-000123" business code at signup.
CREATE OR REPLACE FUNCTION public.generate_business_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    next_number BIGINT;
BEGIN
    next_number := nextval('business_code_seq');
    RETURN 'KPA-' || LPAD(next_number::TEXT, 6, '0');
END;
$function$;

-- Destructive - deletes a business and every dependent row. Only
-- service_role can call it (grants confirmed unchanged from what was
-- already live); the admin API route checks super_admin before calling it.
CREATE OR REPLACE FUNCTION public.delete_business_data(p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_business_exists boolean;
  v_customers integer := 0;
  v_debts integer := 0;
  v_payments integer := 0;
  v_notifications integer := 0;
  v_notification_queue integer := 0;
  v_financial_transactions integer := 0;
  v_notification_templates integer := 0;
  v_business_settings integer := 0;
  v_subscription_payments integer := 0;
  v_system_errors integer := 0;
  v_activity_logs integer := 0;
  v_users integer := 0;
  v_business_requests integer := 0;
begin
  if p_business_id is null then
    raise exception 'Business ID is required';
  end if;

  select exists(select 1 from public.businesses where id = p_business_id) into v_business_exists;

  if not v_business_exists then
    raise exception 'Business not found';
  end if;

  select count(*) into v_customers from public.customers where business_id = p_business_id;
  select count(*) into v_debts from public.debts where business_id = p_business_id;
  select count(*) into v_payments from public.payments where business_id = p_business_id;
  select count(*) into v_notifications from public.notifications where business_id = p_business_id;
  select count(*) into v_notification_queue from public.notification_queue where business_id = p_business_id;
  select count(*) into v_financial_transactions from public.financial_transactions where business_id = p_business_id;
  select count(*) into v_notification_templates from public.notification_templates where business_id = p_business_id;
  select count(*) into v_business_settings from public.business_settings where business_id = p_business_id;
  select count(*) into v_subscription_payments from public.subscription_payments where business_id = p_business_id;
  select count(*) into v_system_errors from public.system_errors where business_id = p_business_id;
  select count(*) into v_activity_logs from public.activity_logs where business_id = p_business_id;
  select count(*) into v_users from public.users where business_id = p_business_id;

  select count(*)
  into v_business_requests
  from public.business_requests br
  where br.status = 'approved'
    and br.email = (select email from public.businesses where id = p_business_id)
    and br.business_name = (select business_name from public.businesses where id = p_business_id);

  delete from public.notification_queue where business_id = p_business_id;
  delete from public.payments where business_id = p_business_id;
  delete from public.financial_transactions where business_id = p_business_id;
  delete from public.debts where business_id = p_business_id;
  delete from public.customers where business_id = p_business_id;
  delete from public.notifications where business_id = p_business_id;
  delete from public.notification_templates where business_id = p_business_id;
  delete from public.business_settings where business_id = p_business_id;
  delete from public.subscription_payments where business_id = p_business_id;
  delete from public.system_errors where business_id = p_business_id;
  delete from public.activity_logs where business_id = p_business_id;
  delete from public.users where business_id = p_business_id;

  delete from public.business_requests
  where status = 'approved'
    and email = (select email from public.businesses where id = p_business_id)
    and business_name = (select business_name from public.businesses where id = p_business_id);

  delete from public.businesses where id = p_business_id;

  return jsonb_build_object(
    'customers', v_customers, 'debts', v_debts, 'payments', v_payments,
    'notifications', v_notifications, 'notification_queue', v_notification_queue,
    'financial_transactions', v_financial_transactions, 'notification_templates', v_notification_templates,
    'business_settings', v_business_settings, 'subscription_payments', v_subscription_payments,
    'system_errors', v_system_errors, 'activity_logs', v_activity_logs,
    'users', v_users, 'business_requests', v_business_requests
  );
end;
$function$;

-- Unused platform-diagnostic helpers (no current caller) - kept for
-- whoever wants to run them from the SQL editor as service_role; grants
-- restricted to service_role in 20260911000003.
CREATE OR REPLACE FUNCTION public.get_tenant_daily_metrics(p_tenant_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(metric_date date, total_events bigint, total_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', created_at)::DATE AS metric_date,
    COUNT(id) AS total_events,
    COALESCE(COUNT(id), 0)::NUMERIC AS total_value
  FROM public.activity_logs
  WHERE business_id = p_tenant_id
    AND created_at BETWEEN p_start_date AND p_end_date
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_database_integrity()
 RETURNS TABLE(check_name text, status text, issue_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 'Orphaned Users'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.users u LEFT JOIN public.businesses b ON b.id = u.business_id
    WHERE u.business_id IS NOT NULL AND b.id IS NULL;

    RETURN QUERY
    SELECT 'Orphaned Customers'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.customers c LEFT JOIN public.businesses b ON b.id = c.business_id
    WHERE b.id IS NULL;

    RETURN QUERY
    SELECT 'Orphaned Debts'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.debts d LEFT JOIN public.businesses b ON b.id = d.business_id
    WHERE b.id IS NULL;

    RETURN QUERY
    SELECT 'Cross-Tenant Debt Violations'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.debts d JOIN public.customers c ON c.id = d.customer_id
    WHERE d.business_id != c.business_id;

    RETURN QUERY
    SELECT 'Negative Debt Amounts'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.debts WHERE amount <= 0 OR amount_paid < 0;

    RETURN QUERY
    SELECT 'Orphaned Payments'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.payments p LEFT JOIN public.debts d ON d.id = p.debt_id
    WHERE d.id IS NULL;

    RETURN QUERY
    SELECT 'Orphaned Queue Items'::TEXT, CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'FAIL'::TEXT END, COUNT(*)
    FROM public.notification_queue nq LEFT JOIN public.businesses b ON b.id = nq.business_id
    WHERE b.id IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_security_compliance()
 RETURNS TABLE(table_name text, rls_enabled boolean, policy_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::TEXT AS table_name,
        c.relrowsecurity AS rls_enabled,
        COUNT(p.polname) AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'businesses', 'users', 'business_requests', 'customers', 'debts',
        'payments', 'notification_templates', 'notification_queue',
        'activity_logs', 'business_settings', 'subscription_payments',
        'notices', 'system_errors'
      )
    GROUP BY c.relname, c.relrowsecurity
    ORDER BY c.relname ASC;
END;
$function$;
