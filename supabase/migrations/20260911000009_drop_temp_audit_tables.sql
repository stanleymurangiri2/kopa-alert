-- Cleanup: drops the last temporary table used to verify trigger
-- attachment during this session's audit (20260911000008). The main
-- _schema_audit_dump table was already dropped at the end of
-- 20260911000006.
DROP TABLE IF EXISTS public._tmp_trigger_check;
