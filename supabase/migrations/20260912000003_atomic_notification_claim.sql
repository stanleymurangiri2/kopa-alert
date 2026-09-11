-- Fixes a real double-send bug: the cron route (src/app/api/cron/notifications)
-- previously did a plain SELECT of pending/retryable rows, then sent each one,
-- then marked it sent/failed. Two overlapping cron invocations (a duplicate or
-- retried trigger, or a manual trigger racing the schedule) could both select
-- and send the same rows before either had a chance to mark them, resulting in
-- a real double-sent SMS and double-decremented balance.
--
-- Adds an intermediate 'processing' status and an atomic claim function: a
-- single UPDATE ... WHERE ... RETURNING is what actually closes the race -
-- Postgres row-level locking means a concurrent UPDATE against the same rows
-- simply won't match them anymore once the first transaction commits, so only
-- one caller can ever claim a given row. Also reclaims rows stuck in
-- 'processing' (a crashed/timed-out run) after a bounded window, since
-- otherwise this fix would trade "occasional double-send" for "a crashed run
-- permanently stops a notification from ever being retried" - worse for users.

ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'processing';

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.claim_notification_batch(
  p_max_attempts INT,
  p_stuck_after_minutes INT DEFAULT 10
)
RETURNS SETOF public.notification_queue
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.notification_queue
  SET status = 'processing', updated_at = NOW()
  WHERE
    (status = 'pending' AND scheduled_for <= NOW())
    OR (status = 'failed' AND attempts < p_max_attempts)
    OR (status = 'processing' AND updated_at < NOW() - (p_stuck_after_minutes || ' minutes')::INTERVAL)
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_batch(INT, INT) FROM PUBLIC, anon, authenticated;
