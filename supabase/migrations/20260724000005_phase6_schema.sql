-- Enum Types for Notification Channel and Queue Status
CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp');
CREATE TYPE queue_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
CREATE TYPE reminder_type AS ENUM ('upcoming', 'due_today', 'overdue');

-- Notification Templates Table
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    type reminder_type NOT NULL,
    channel notification_channel NOT NULL DEFAULT 'sms',
    message_template TEXT NOT NULL,
    days_offset INT NOT NULL DEFAULT 0, -- e.g. -3 for 3 days before, 0 for due date, 3 for 3 days after
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(business_id, type, channel)
);

-- Notification Queue Table
CREATE TABLE public.notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL DEFAULT 'sms',
    recipient_phone VARCHAR(20) NOT NULL,
    message_body TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status queue_status NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query execution
CREATE INDEX idx_queue_business ON public.notification_queue(business_id);
CREATE INDEX idx_queue_status_scheduled ON public.notification_queue(status, scheduled_for);
CREATE INDEX idx_queue_debt ON public.notification_queue(debt_id);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Super Admin access all templates" ON public.notification_templates
FOR ALL USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Users access own business templates" ON public.notification_templates
FOR ALL USING (business_id = public.get_current_user_business_id())
WITH CHECK (business_id = public.get_current_user_business_id());

CREATE POLICY "Super Admin access all queue items" ON public.notification_queue
FOR ALL USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Users access own business queue" ON public.notification_queue
FOR ALL USING (business_id = public.get_current_user_business_id())
WITH CHECK (business_id = public.get_current_user_business_id());

-- FUNCTION: Generate Default Notification Templates when a new Business is created
CREATE OR REPLACE FUNCTION public.seed_default_templates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_templates (business_id, type, channel, days_offset, message_template)
    VALUES
    (NEW.id, 'upcoming', 'sms', -2, 'Hello {customer_name}, this is a gentle reminder that your balance of KES {balance} for "{description}" is due on {due_date}. {payment_instructions}'),
    (NEW.id, 'due_today', 'sms', 0, 'Hello {customer_name}, your balance of KES {balance} for "{description}" is due TODAY ({due_date}). Please clear it via: {payment_instructions}'),
    (NEW.id, 'overdue', 'sms', 3, 'URGENT: Hello {customer_name}, your account balance of KES {balance} was due on {due_date} and is now overdue. Please remit payment immediately: {payment_instructions}')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_seed_default_templates
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_templates();

-- STORED PROCEDURE: Daily Reminder Generator (Runs via Supabase Cron / Scheduled Job)
CREATE OR REPLACE FUNCTION public.generate_daily_reminders()
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    r RECORD;
    v_msg TEXT;
    v_balance NUMERIC(12,2);
BEGIN
    -- Loop through active templates and match debts by calculated target dates
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
        v_msg := REPLACE(v_msg, '{business_name}', r.business_name);
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