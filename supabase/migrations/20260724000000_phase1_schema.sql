-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enum Types for Statuses and Roles
CREATE TYPE business_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE user_role AS ENUM ('super_admin', 'business_admin', 'employee');

-- 1. Businesses Table
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status business_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Table (Extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'employee',
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper Function: Get current user business_id
CREATE OR REPLACE FUNCTION public.get_current_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS POLICIES FOR USERS TABLE
-- Super admin can view and manage all users
CREATE POLICY "Super Admin access all users"
ON public.users
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

-- Users can view profiles within their own business
CREATE POLICY "Users view same business team"
ON public.users
FOR SELECT
USING (
  business_id = public.get_current_user_business_id()
  OR id = auth.uid()
);

-- Business Admin can manage employees in their business
CREATE POLICY "Business Admin manage employees"
ON public.users
FOR ALL
USING (
  public.get_current_user_role() = 'business_admin'
  AND business_id = public.get_current_user_business_id()
);

-- RLS POLICIES FOR BUSINESSES TABLE
-- Super admin full access
CREATE POLICY "Super Admin access all businesses"
ON public.businesses
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

-- Users can view their own business details
CREATE POLICY "Users view own business"
ON public.businesses
FOR SELECT
USING (id = public.get_current_user_business_id());

-- Business Admin can update their own business details
CREATE POLICY "Business Admin update own business"
ON public.businesses
FOR UPDATE
USING (
  id = public.get_current_user_business_id()
  AND public.get_current_user_role() = 'business_admin'
);