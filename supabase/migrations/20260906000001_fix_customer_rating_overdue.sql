-- calculate_customer_ratings() counted debts.status = 'overdue' directly, but that
-- column only gets recalculated by a trigger on payment insert (sync_debt_on_payment).
-- A debt that goes overdue with zero payments ever made stays 'pending' forever, so
-- customers whose debts were overdue-but-never-paid were undercounted and rated
-- better than they should have been. Derive overdue the same way the rest of the
-- app now does: unpaid balance whose due date has passed, not the stored status.
CREATE OR REPLACE FUNCTION public.calculate_customer_ratings()
RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  v_total INT;
  v_overdue INT;
  v_fully_paid INT;
  v_on_time INT;
  v_on_time_rate NUMERIC;
  v_overdue_ratio NUMERIC;
  v_rating TEXT;
  v_count INT := 0;
BEGIN
  FOR r IN SELECT id, is_blacklisted FROM customers LOOP
    IF r.is_blacklisted THEN
      UPDATE customers SET rating = 'Blacklisted' WHERE id = r.id;
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_total FROM debts WHERE customer_id = r.id;

    IF v_total = 0 THEN
      CONTINUE;
    END IF;

    SELECT COUNT(*) INTO v_overdue
    FROM debts
    WHERE customer_id = r.id
      AND (amount - amount_paid) > 0
      AND due_date < CURRENT_DATE;

    SELECT COUNT(*) INTO v_fully_paid FROM debts WHERE customer_id = r.id AND status = 'fully_paid';
    SELECT COUNT(*) INTO v_on_time FROM debts WHERE customer_id = r.id AND status = 'fully_paid' AND updated_at::date <= due_date;

    v_overdue_ratio := v_overdue::NUMERIC / v_total;
    v_on_time_rate := CASE WHEN v_fully_paid = 0 THEN 0 ELSE v_on_time::NUMERIC / v_fully_paid END;

    IF v_overdue_ratio = 0 AND v_on_time_rate >= 0.9 THEN
      v_rating := 'Excellent';
    ELSIF v_overdue_ratio <= 0.1 AND v_on_time_rate >= 0.7 THEN
      v_rating := 'Good';
    ELSIF v_overdue_ratio <= 0.3 THEN
      v_rating := 'Fair';
    ELSE
      v_rating := 'Poor';
    END IF;

    UPDATE customers SET rating = v_rating WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
