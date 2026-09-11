-- Continuation of the temporary audit dump: grants on the remaining
-- admin/cron functions not checked in 20260911000001.
INSERT INTO public._schema_audit_dump (kind, name, definition)
SELECT 'grants', p.proname,
  (SELECT string_agg(grantee || ':' || privilege_type, ', ')
   FROM information_schema.routine_privileges rp
   WHERE rp.routine_name = p.proname AND rp.routine_schema = 'public')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'approve_business_request', 'expire_stale_pending_requests', 'purge_old_audit_logs',
    'process_subscription_billing_cycle', 'auto_blacklist_overdue_customers',
    'calculate_customer_ratings', 'seed_default_business_settings', 'seed_default_templates'
  );
