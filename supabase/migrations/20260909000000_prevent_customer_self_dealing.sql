-- Stop a business from recording a debt against itself, and stop the same
-- phone/email being used for more than one customer inside a business.
--
-- Debts always point at a customers row, so enforcing this at customer
-- create/update time covers debt creation too (there is no way to create a
-- debt for a person without first creating their customer record).
--
-- Two things are blocked:
--   1. Self-dealing: a customer whose phone/email matches the business's own
--      registered contact details, or matches one of the business's own
--      team members (users.email) — i.e. the business (or one of its staff)
--      trying to owe money to itself.
--   2. Duplicate personal data: the same phone number, or the same email,
--      used for two different customer rows inside the same business.

CREATE OR REPLACE FUNCTION public.prevent_customer_self_dealing()
RETURNS TRIGGER AS $$
DECLARE
  biz_phone TEXT;
  biz_email TEXT;
BEGIN
  SELECT phone, email INTO biz_phone, biz_email
  FROM public.businesses
  WHERE id = NEW.business_id;

  IF biz_phone IS NOT NULL AND trim(NEW.phone) = trim(biz_phone) THEN
    RAISE EXCEPTION 'A business cannot add itself as a customer (phone matches the business account).';
  END IF;

  IF NEW.email IS NOT NULL AND biz_email IS NOT NULL
     AND lower(trim(NEW.email)) = lower(trim(biz_email)) THEN
    RAISE EXCEPTION 'A business cannot add itself as a customer (email matches the business account).';
  END IF;

  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.business_id = NEW.business_id
      AND lower(trim(u.email)) = lower(trim(NEW.email))
  ) THEN
    RAISE EXCEPTION 'A team member cannot be added as a customer using their own account email.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_customer_self_dealing ON public.customers;

CREATE TRIGGER trg_prevent_customer_self_dealing
BEFORE INSERT OR UPDATE OF business_id, phone, email ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_self_dealing();

-- Same phone number cannot be reused across two customer rows in one business.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone_unique
ON public.customers (business_id, trim(phone));

-- Same email cannot be reused across two customer rows in one business
-- (NULL/blank emails are exempt since many customers have none on file).
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_email_unique
ON public.customers (business_id, lower(trim(email)))
WHERE email IS NOT NULL AND trim(email) <> '';
