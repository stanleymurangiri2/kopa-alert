# 🚀 KopaAlert Production Go-Live Checklist

## 1. Supabase Environment Setup
- [ ] Run all SQL migrations (`Phase 1` through `Phase 9`) in the Supabase Production SQL Editor.
- [ ] Verify Row Level Security (RLS) is enabled on all tables (`businesses`, `user_profiles`, `customers`, `debts`, `payments`, `sms_queue`, `business_settings`).
- [ ] Deploy Edge Function for SMS cron:
  ```bash
  supabase functions deploy process-sms-queue --no-verify-jwt