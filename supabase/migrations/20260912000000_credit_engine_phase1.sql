-- Phase 1 of the ML Credit Limit Engine (see docs/KopaAlert ML Credit Limit Engine
-- Implementation Prompt.pdf). This phase is rule-based, not ML-backed yet: there is
-- no meaningful repayment-history volume across the platform to train a model on.
-- `credit_assessments.model_version` starts at 'rules-v1' so a future ML phase can
-- be distinguished from this one without a schema change.

CREATE TYPE risk_category AS ENUM (
  'LOW', 'MODERATE_LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'INSUFFICIENT_DATA'
);

CREATE TYPE credit_assessment_status AS ENUM ('OK', 'INSUFFICIENT_DATA', 'FAILED');

-- Per-customer lending ceiling. Deliberately distinct from customers.available_credit,
-- which is an unrelated overpayment/credit-note balance auto-applied to new debts.
ALTER TABLE public.customers
  ADD COLUMN credit_limit NUMERIC(12, 2) NULL CHECK (credit_limit IS NULL OR credit_limit >= 0);

COMMENT ON COLUMN public.customers.credit_limit IS
  'Lending ceiling set by the business, via the credit-limit engine. NULL means the business default_credit_limit applies. Unrelated to available_credit (an overpayment balance).';

-- Business-configurable credit-limit rules (MVP subset).
ALTER TABLE public.businesses
  ADD COLUMN default_credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 5000 CHECK (default_credit_limit >= 0),
  ADD COLUMN max_credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 50000 CHECK (max_credit_limit >= 0),
  ADD COLUMN credit_reduction_pct NUMERIC(5, 2) NOT NULL DEFAULT 25 CHECK (credit_reduction_pct BETWEEN 0 AND 100),
  ADD COLUMN freeze_on_severe_overdue BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_max_ge_default_credit_limit CHECK (max_credit_limit >= default_credit_limit);

CREATE TABLE public.credit_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    status credit_assessment_status NOT NULL DEFAULT 'OK',
    risk_score INTEGER NULL CHECK (risk_score IS NULL OR risk_score BETWEEN 0 AND 100),
    risk_category risk_category NOT NULL,
    current_credit_limit NUMERIC(12, 2) NOT NULL,
    recommended_credit_limit NUMERIC(12, 2) NOT NULL,
    outstanding_balance NUMERIC(12, 2) NOT NULL,
    credit_utilization NUMERIC(6, 4) NULL,
    reasons JSONB NOT NULL DEFAULT '[]',
    features JSONB NOT NULL DEFAULT '{}',
    model_version TEXT NOT NULL DEFAULT 'rules-v1',
    error_message TEXT NULL,
    applied BOOLEAN NOT NULL DEFAULT false,
    applied_at TIMESTAMPTZ NULL,
    applied_by UUID NULL REFERENCES public.users(id),
    created_by UUID NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.credit_assessments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_credit_assessments_customer_created ON public.credit_assessments(customer_id, created_at DESC);
CREATE INDEX idx_credit_assessments_business_id ON public.credit_assessments(business_id);

-- RLS POLICIES FOR CREDIT_ASSESSMENTS TABLE (mirrors debts/payments exactly)

CREATE POLICY "Super Admin access all credit assessments"
ON public.credit_assessments
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Users access own business credit assessments"
ON public.credit_assessments
FOR ALL
USING (
  business_id = public.get_current_user_business_id()
)
WITH CHECK (
  business_id = public.get_current_user_business_id()
);
