INSERT INTO public._schema_audit_dump (kind, name, definition)
SELECT 'trigger', t.tgname,
  c.relname || ' | ' || p.proname || ' | enabled=' || t.tgenabled::text
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND c.relname IN ('debts', 'payments');
