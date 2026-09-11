-- TEMPORARY, self-cleaning audit aid - not a real schema change.
-- Dumps every function/view/table definition in the public schema into a
-- queryable table so it can be read back over the REST API (no direct
-- psql/pg access was available in the session that needed this). A
-- follow-up migration drops this table once the dump has been read.
CREATE TABLE IF NOT EXISTS public._schema_audit_dump (
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  definition TEXT
);

TRUNCATE public._schema_audit_dump;

INSERT INTO public._schema_audit_dump (kind, name, definition)
SELECT 'function', p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

INSERT INTO public._schema_audit_dump (kind, name, definition)
SELECT 'view', c.relname, pg_get_viewdef(c.oid, true)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v';

INSERT INTO public._schema_audit_dump (kind, name, definition)
SELECT 'table_columns', c.relname,
  string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod) ||
    CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END, ', ' ORDER BY a.attnum)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname;

ALTER TABLE public._schema_audit_dump ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin only" ON public._schema_audit_dump;
CREATE POLICY "Super Admin only" ON public._schema_audit_dump
FOR ALL USING (public.get_current_user_role() = 'super_admin');
