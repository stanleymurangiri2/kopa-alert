-- TEMPORARY diagnostic function, self-cleaning via a follow-up migration.
-- Checks whether uuid_generate_v4() (used as the PK default on customers,
-- debts, payments, businesses since the original July schema) actually
-- resolves for the same runtime path the app uses (PostgREST/service_role),
-- after it failed to resolve during a CLI-driven `db push`.
CREATE OR REPLACE FUNCTION public.__temp_check_uuid_gen()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_legacy TEXT;
  v_legacy_error TEXT;
  v_modern TEXT;
  v_modern_error TEXT;
  v_extensions JSONB;
  v_search_path TEXT;
BEGIN
  BEGIN
    v_legacy := uuid_generate_v4()::TEXT;
  EXCEPTION WHEN OTHERS THEN
    v_legacy_error := SQLERRM;
  END;

  BEGIN
    v_modern := gen_random_uuid()::TEXT;
  EXCEPTION WHEN OTHERS THEN
    v_modern_error := SQLERRM;
  END;

  SELECT jsonb_agg(jsonb_build_object('name', extname, 'schema', n.nspname))
  INTO v_extensions
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE extname ILIKE '%uuid%' OR extname = 'pgcrypto';

  SELECT current_setting('search_path') INTO v_search_path;

  RETURN jsonb_build_object(
    'legacy_uuid_generate_v4_works', v_legacy IS NOT NULL,
    'legacy_error', v_legacy_error,
    'modern_gen_random_uuid_works', v_modern IS NOT NULL,
    'modern_error', v_modern_error,
    'uuid_related_extensions', COALESCE(v_extensions, '[]'::jsonb),
    'search_path', v_search_path
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.__temp_check_uuid_gen() TO service_role;
