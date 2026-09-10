-- Make the business name stand out at the top of every automated SMS
-- reminder. Outbound SMS is sent from the business owner's own phone
-- number (no registered alphanumeric sender ID), so without this a
-- customer has no way of telling which business is texting them.

-- New businesses: put {business_name} on its own line at the start of
-- each default template.
CREATE OR REPLACE FUNCTION public.seed_default_templates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_templates (business_id, type, channel, days_offset, message_template)
    VALUES
    (NEW.id, 'upcoming', 'sms', -2, '{business_name}
Hello {customer_name}, this is a gentle reminder that your balance of KES {balance} for "{description}" is due on {due_date}. {payment_instructions}'),
    (NEW.id, 'due_today', 'sms', 0, '{business_name}
Hello {customer_name}, your balance of KES {balance} for "{description}" is due TODAY ({due_date}). Please clear it via: {payment_instructions}'),
    (NEW.id, 'overdue', 'sms', 3, '{business_name}
URGENT: Hello {customer_name}, your account balance of KES {balance} was due on {due_date} and is now overdue. Please remit payment immediately: {payment_instructions}')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Plain SMS has no bold formatting - ALL CAPS is the closest equivalent,
-- and reads like a sender label at the top of the message.
CREATE OR REPLACE FUNCTION public.generate_daily_reminders()
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    r RECORD;
    v_msg TEXT;
    v_balance NUMERIC(12,2);
BEGIN
    FOR r IN
        SELECT
            t.id AS template_id,
            t.business_id,
            t.channel,
            t.message_template,
            d.id AS debt_id,
            d.customer_id,
            d.amount,
            d.amount_paid,
            d.description,
            d.payment_instructions,
            d.due_date,
            c.full_name AS customer_name,
            c.phone AS customer_phone,
            b.business_name
        FROM public.notification_templates t
        JOIN public.debts d ON d.business_id = t.business_id
        JOIN public.customers c ON c.id = d.customer_id
        JOIN public.businesses b ON b.id = t.business_id
        WHERE t.is_active = true
          AND d.status IN ('pending', 'partially_paid', 'overdue')
          AND d.due_date = (CURRENT_DATE - (t.days_offset || ' days')::INTERVAL)::DATE
    LOOP
        v_balance := r.amount - r.amount_paid;

        -- Interpolate Template Variables
        v_msg := r.message_template;
        v_msg := REPLACE(v_msg, '{customer_name}', r.customer_name);
        v_msg := REPLACE(v_msg, '{business_name}', UPPER(r.business_name));
        v_msg := REPLACE(v_msg, '{amount}', r.amount::TEXT);
        v_msg := REPLACE(v_msg, '{balance}', v_balance::TEXT);
        v_msg := REPLACE(v_msg, '{description}', r.description);
        v_msg := REPLACE(v_msg, '{due_date}', r.due_date::TEXT);
        v_msg := REPLACE(v_msg, '{payment_instructions}', COALESCE(r.payment_instructions, 'Please contact vendor.'));

        -- Insert into Queue if not already queued for this debt/type today
        IF NOT EXISTS (
            SELECT 1 FROM public.notification_queue
            WHERE debt_id = r.debt_id
              AND DATE(created_at) = CURRENT_DATE
              AND status IN ('pending', 'sent')
        ) THEN
            INSERT INTO public.notification_queue (
                business_id, debt_id, customer_id, channel, recipient_phone, message_body, scheduled_for, status
            ) VALUES (
                r.business_id, r.debt_id, r.customer_id, r.channel, r.customer_phone, v_msg, NOW(), 'pending'
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Existing businesses: prepend {business_name} to templates that are still
-- exactly the original default wording (never customized), so businesses
-- that already edited their own templates are left untouched.
UPDATE public.notification_templates
SET message_template = '{business_name}' || E'\n' || message_template
WHERE type = 'upcoming' AND channel = 'sms'
  AND message_template = 'Hello {customer_name}, this is a gentle reminder that your balance of KES {balance} for "{description}" is due on {due_date}. {payment_instructions}';

UPDATE public.notification_templates
SET message_template = '{business_name}' || E'\n' || message_template
WHERE type = 'due_today' AND channel = 'sms'
  AND message_template = 'Hello {customer_name}, your balance of KES {balance} for "{description}" is due TODAY ({due_date}). Please clear it via: {payment_instructions}';

UPDATE public.notification_templates
SET message_template = '{business_name}' || E'\n' || message_template
WHERE type = 'overdue' AND channel = 'sms'
  AND message_template = 'URGENT: Hello {customer_name}, your account balance of KES {balance} was due on {due_date} and is now overdue. Please remit payment immediately: {payment_instructions}';
