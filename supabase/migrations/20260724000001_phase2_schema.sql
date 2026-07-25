-- Create Enum Type for Request Status if not existing
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create Business Requests Table
CREATE TABLE public.business_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_requests
-- Public access: Anyone can submit a business registration request
CREATE POLICY "Public insert business request"
ON public.business_requests
FOR INSERT
WITH CHECK (true);

-- Super admin full access: View, update, delete requests
CREATE POLICY "Super Admin manage business requests"
ON public.business_requests
FOR ALL
USING (public.get_current_user_role() = 'super_admin');