-- Atomically decrement a business's SMS balance by 1, never going below 0.
-- Called by the notification cron after a message is successfully sent.
CREATE OR REPLACE FUNCTION public.decrement_sms_balance(p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.businesses
    SET sms_balance = GREATEST(COALESCE(sms_balance, 0) - 1, 0)
    WHERE id = p_business_id
    RETURNING sms_balance INTO v_new_balance;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
