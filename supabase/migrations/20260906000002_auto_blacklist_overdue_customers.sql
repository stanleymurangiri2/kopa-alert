-- Design spec: the "Overdue 10+ days" Debt Ledger status pill is described as an
-- "auto-blacklist trigger". Automatically blacklist any customer who is not already
-- blacklisted but has at least one debt with an unpaid balance whose due date is
-- more than 10 days in the past. Mirrors calculate_customer_ratings()'s overdue
-- derivation (unpaid balance + due date, not the stale debts.status column) and
-- sets rating = 'Blacklisted' immediately rather than waiting for the monthly
-- ratings cron to catch up.
CREATE OR REPLACE FUNCTION public.auto_blacklist_overdue_customers()
RETURNS TABLE(out_customer_id UUID, out_business_id UUID, out_full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE customers c
  SET is_blacklisted = true,
      blacklisted_at = now(),
      rating = 'Blacklisted'
  WHERE c.is_blacklisted = false
    AND EXISTS (
      SELECT 1 FROM debts d
      WHERE d.customer_id = c.id
        AND (d.amount - d.amount_paid) > 0
        AND d.due_date < CURRENT_DATE - INTERVAL '10 days'
    )
  RETURNING c.id, c.business_id, c.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
