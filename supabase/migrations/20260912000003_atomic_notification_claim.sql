-- Fixes a real double-send bug: the cron route (src/app/api/cron/notifications)
-- previously did a plain SELECT of pending/retryable rows, then sent each one,
-- then marked it sent/failed. Two overlapping cron invocations (a duplicate or
-- retried trigger, or a manual trigger racing the schedule) could both select
-- and send the same rows before either had a chance to mark them, resulting in
-- a real double-sent SMS and double-decremented balance.
--
-- Adds an intermediate 'processing' status and (in the next migration) an
-- atomic claim function. The new enum value has to land in its own migration/
-- transaction - Postgres won't let a newly-added enum value be used by name
-- until the transaction that added it has committed.

ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'processing';

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
