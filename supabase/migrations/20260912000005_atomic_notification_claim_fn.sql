-- Single UPDATE ... WHERE ... RETURNING is what actually closes the race -
-- Postgres row-level locking means a concurrent UPDATE against the same rows
-- simply won't match them anymore once the first transaction commits, so only
-- one caller can ever claim a given row. Also reclaims rows stuck in
-- 'processing' (a crashed/timed-out run) after a bounded window, since
-- otherwise this fix would trade "occasional double-send" for "a crashed run
-- permanently stops a notification from ever being retried" - worse for users.
--
-- Split from 20260912000003 because the 'processing' enum value it uses can't
-- be referenced until the migration that added it has committed.

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
