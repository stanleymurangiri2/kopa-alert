CREATE TABLE IF NOT EXISTS public._tmp_trigger_check (info TEXT);

INSERT INTO public._tmp_trigger_check (info)
SELECT c.relname || ' | ' || p.proname || ' | enabled=' || t.tgenabled::text
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND c.relname IN ('debts', 'payments');

ALTER TABLE public._tmp_trigger_check ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin only" ON public._tmp_trigger_check;
CREATE POLICY "Super Admin only" ON public._tmp_trigger_check
FOR ALL USING (public.get_current_user_role() = 'super_admin');
