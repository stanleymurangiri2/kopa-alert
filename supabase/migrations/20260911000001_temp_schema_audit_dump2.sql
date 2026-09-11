-- Continuation of the temporary audit dump (20260911000000): checking
-- EXECUTE grants on the security-sensitive functions found there.
INSERT INTO public._schema_audit_dump (kind, name, definition)
SELECT 'grants', p.proname,
  (SELECT string_agg(grantee || ':' || privilege_type, ', ')
   FROM information_schema.routine_privileges rp
   WHERE rp.routine_name = p.proname AND rp.routine_schema = 'public')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_debt_with_credit', 'record_customer_payment', 'delete_business_data',
    'verify_database_integrity', 'audit_security_compliance', 'get_tenant_daily_metrics',
    'import_customer_transactions', 'generate_daily_reminders', 'decrement_sms_balance'
  );
