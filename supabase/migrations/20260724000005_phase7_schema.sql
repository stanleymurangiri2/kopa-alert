-- Function to get daily active count over a date range for a specific tenant
CREATE OR REPLACE FUNCTION get_tenant_daily_metrics(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  metric_date DATE,
  total_events BIGINT,
  total_value NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', created_at)::DATE AS metric_date,
    COUNT(id) AS total_events,
    COALESCE(SUM(value), 0) AS total_value
  FROM activity_logs
  WHERE tenant_id = p_tenant_id
    AND created_at BETWEEN p_start_date AND p_end_date
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;