-- SMS reminder wording moves from "each business edits its own copy" to
-- "super_admin edits one platform-wide template, every business gets it".
-- Businesses keep read-only visibility into their active templates; anyone
-- who wants different wording now goes through customer support instead of
-- self-service editing, so a business can no longer accidentally strip the
-- {business_name} line added in 20260910000000.

-- Single source of truth for the platform's default reminder wording.
CREATE TABLE IF NOT EXISTS public.platform_notification_templates (
  type reminder_type NOT NULL,
  channel notification_channel NOT NULL,
  message_template TEXT NOT NULL,
  days_offset INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id),
  PRIMARY KEY (type, channel)
);

ALTER TABLE public.platform_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin manages platform templates" ON public.platform_notification_templates
FOR ALL USING (public.get_current_user_role() = 'super_admin')
WITH CHECK (public.get_current_user_role() = 'super_admin');

INSERT INTO public.platform_notification_templates (type, channel, days_offset, message_template)
VALUES
  ('upcoming', 'sms', -2, '{business_name}
Hello {customer_name}, this is a gentle reminder that your balance of KES {balance} for "{description}" is due on {due_date}. {payment_instructions}'),
  ('due_today', 'sms', 0, '{business_name}
Hello {customer_name}, your balance of KES {balance} for "{description}" is due TODAY ({due_date}). Please clear it via: {payment_instructions}'),
  ('overdue', 'sms', 3, '{business_name}
URGENT: Hello {customer_name}, your account balance of KES {balance} was due on {due_date} and is now overdue. Please remit payment immediately: {payment_instructions}')
ON CONFLICT (type, channel) DO NOTHING;

-- New businesses now inherit the current platform default at signup, instead
-- of a copy hardcoded into this function.
CREATE OR REPLACE FUNCTION public.seed_default_templates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_templates (business_id, type, channel, days_offset, message_template, is_active)
    SELECT NEW.id, pt.type, pt.channel, pt.days_offset, pt.message_template, pt.is_active
    FROM public.platform_notification_templates pt
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Businesses can see their active templates but can no longer edit them -
-- customization now goes through customer support, so it can't accidentally
-- remove the {business_name} line.
DROP POLICY IF EXISTS "Users access own business templates" ON public.notification_templates;

CREATE POLICY "Users view own business templates" ON public.notification_templates
FOR SELECT USING (business_id = public.get_current_user_business_id());
