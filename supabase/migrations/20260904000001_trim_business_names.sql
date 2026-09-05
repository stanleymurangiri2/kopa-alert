-- ============================================================
-- KopaAlert: Trim business names during approval
-- Prevent leading/trailing whitespace from being stored.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_business_request(
  p_request_id uuid,
  p_auth_user_id uuid,
  p_activation_token text
)
RETURNS TABLE(
  business_id uuid,
  business_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_request business_requests%ROWTYPE;
  v_business_id uuid;
  v_business_code text;
BEGIN
  -- Load request
  SELECT *
  INTO v_request
  FROM business_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration request not found.';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Request has already been processed.';
  END IF;

  -- Generate Business Code
  v_business_code :=
    'KA-' ||
    TO_CHAR(
      NEXTVAL('business_code_seq'),
      'FM000000'
    );

  -- Create business
  INSERT INTO businesses (
    business_code,
    business_name,
    phone,
    email,
    status,
    activation_token,
    invitation_sent_at,
    invitation_expires_at
  )
  VALUES (
    v_business_code,
    BTRIM(v_request.business_name),
    BTRIM(v_request.phone),
    BTRIM(v_request.email),
    'approved',
    p_activation_token,
    NOW(),
    NOW() + INTERVAL '72 hours'
  )
  RETURNING id
  INTO v_business_id;

  -- Create business administrator
  INSERT INTO users (
    id,
    business_id,
    role,
    name,
    email
  )
  VALUES (
    p_auth_user_id,
    v_business_id,
    'business_admin',
    v_request.owner_name,
    v_request.email
  );

  -- Update request
  UPDATE business_requests
  SET
    status = 'approved',
    approved_at = NOW()
  WHERE id = p_request_id;

  RETURN QUERY
  SELECT
    v_business_id,
    v_business_code;
END;
$function$;
