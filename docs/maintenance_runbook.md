# 🛡️ Post-Launch Maintenance & Incident Response

## 1. System Monitoring & Health Checks
- **Supabase Dashboard**: Monitor database connection pooling, CPU usage, and storage limits.
- **Netlify Analytics / Function Logs**: Check server response times and API route error rates (`5xx` response codes).
- **Africa's Talking Dashboard**: Monitor SMS delivery rates, failed status codes, and remaining wallet credit.

## 2. Common Incident Protocols

### Incident A: SMS Dispatch Stopped
1. Check `sms_queue` table in Supabase for status `'failed'` or backlog in `'pending'`.
2. Inspect Africa's Talking balance to ensure funds are available.
3. Verify Supabase `pg_cron` status:
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;