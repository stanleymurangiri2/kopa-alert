-- businesses.sms_balance defaulted to 50, so every newly-approved business
-- silently got 50 free SMS credits before the super admin ever granted any.
-- Credits should only come from an explicit admin top-up (Add/Deduct control
-- on Business Management), so new businesses now start at 0.
ALTER TABLE public.businesses
  ALTER COLUMN sms_balance SET DEFAULT 0;
