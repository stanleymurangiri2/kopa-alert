-- Fixes a real race condition: /api/notifications/bulk-sms read sms_balance,
-- compared it to the recipient count, and only decremented the stored balance
-- AFTER sending - the check itself was a plain read-then-compare with no
-- reservation. Two concurrent bulk-SMS requests for the same business (two
-- admin sessions, or a double-submit) could both read the same pre-send
-- balance, both pass the check, and both proceed to actually send - more SMS
-- sent and billed by Africa's Talking than the business's balance allowed.
--
-- reserve_sms_balance atomically checks-and-decrements in one locked
-- statement (SELECT ... FOR UPDATE blocks a concurrent caller until the
-- first transaction commits, so the second sees the already-reduced balance
-- and correctly fails if insufficient). refund_sms_balance gives back any
-- portion reserved for recipients that didn't actually get a message (no
-- phone number, or the send itself failed).

CREATE OR REPLACE FUNCTION public.reserve_sms_balance(
  p_business_id UUID,
  p_amount INT
)
RETURNS TABLE(reserved BOOLEAN, new_balance INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current INT;
BEGIN
  SELECT sms_balance INTO v_current
  FROM public.businesses
  WHERE id = p_business_id
  FOR UPDATE;

  IF v_current IS NULL OR v_current < p_amount THEN
    RETURN QUERY SELECT false, COALESCE(v_current, 0);
    RETURN;
  END IF;

  UPDATE public.businesses
  SET sms_balance = sms_balance - p_amount
  WHERE id = p_business_id;

  RETURN QUERY SELECT true, v_current - p_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_sms_balance(
  p_business_id UUID,
  p_amount INT
)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.businesses
  SET sms_balance = COALESCE(sms_balance, 0) + p_amount
  WHERE id = p_business_id
  RETURNING sms_balance;
$$;

REVOKE ALL ON FUNCTION public.reserve_sms_balance(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_sms_balance(uuid, int) FROM PUBLIC, anon, authenticated;
