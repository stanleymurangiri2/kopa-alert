-- Create Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Indexes for fast query lookups per tenant
CREATE INDEX idx_customers_business_id ON public.customers(business_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- RLS POLICIES FOR CUSTOMERS TABLE

-- Super Admin: Full read/write access across all tenants
CREATE POLICY "Super Admin access all customers"
ON public.customers
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

-- Business Admin & Employees: Access ONLY their own business customers
CREATE POLICY "Users access own business customers"
ON public.customers
FOR ALL
USING (
  business_id = public.get_current_user_business_id()
)
WITH CHECK (
  business_id = public.get_current_user_business_id()
);