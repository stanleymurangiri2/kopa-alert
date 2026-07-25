-- Create Enum Type for Debt Status
CREATE TYPE debt_status AS ENUM ('pending', 'partially_paid', 'fully_paid', 'overdue');

-- Create Debts Table
CREATE TABLE public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    description TEXT NOT NULL,
    payment_instructions TEXT,
    due_date DATE NOT NULL,
    status debt_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_debts_business_id ON public.debts(business_id);
CREATE INDEX idx_debts_customer_id ON public.debts(customer_id);
CREATE INDEX idx_debts_due_date ON public.debts(due_date);
CREATE INDEX idx_debts_status ON public.debts(status);

-- RLS POLICIES FOR DEBTS TABLE

-- Super Admin: Access all debts
CREATE POLICY "Super Admin access all debts"
ON public.debts
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

-- Business Admin & Employees: Access ONLY their business debts
CREATE POLICY "Users access own business debts"
ON public.debts
FOR ALL
USING (
  business_id = public.get_current_user_business_id()
)
WITH CHECK (
  business_id = public.get_current_user_business_id()
);