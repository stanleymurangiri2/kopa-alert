-- Create Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'mpesa',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_payments_business_id ON public.payments(business_id);
CREATE INDEX idx_payments_debt_id ON public.payments(debt_id);

-- RLS POLICIES FOR PAYMENTS TABLE
CREATE POLICY "Super Admin access all payments"
ON public.payments
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Users access own business payments"
ON public.payments
FOR ALL
USING (
  business_id = public.get_current_user_business_id()
)
WITH CHECK (
  business_id = public.get_current_user_business_id()
);

-- AUTOMATIC DEBT BALANCE & STATUS SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_debt_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(12, 2);
    v_total_amount NUMERIC(12, 2);
    v_due_date DATE;
    v_new_status debt_status;
BEGIN
    -- Calculate new total amount paid for this debt
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO v_total_paid
    FROM public.payments
    WHERE debt_id = NEW.debt_id;

    -- Fetch original debt total and due date
    SELECT amount, due_date
    INTO v_total_amount, v_due_date
    FROM public.debts
    WHERE id = NEW.debt_id;

    -- Determine new status logically
    IF v_total_paid >= v_total_amount THEN
        v_new_status := 'fully_paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'partially_paid';
    ELSIF v_due_date < CURRENT_DATE THEN
        v_new_status := 'overdue';
    ELSE
        v_new_status := 'pending';
    END IF;

    -- Update the parent debt record
    UPDATE public.debts
    SET 
        amount_paid = v_total_paid,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = NEW.debt_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_debt_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_debt_on_payment();