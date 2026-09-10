-- Lets /api/auth/forgot-password enforce a per-account cooldown so the
-- endpoint can't be used to spam a target's inbox with reset emails,
-- without needing an external rate-limiting service.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_password_reset_request_at TIMESTAMPTZ;
