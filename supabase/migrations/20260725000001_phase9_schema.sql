-- Create Business Settings table for gateway & operational defaults
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    sms_provider VARCHAR(50) NOT NULL DEFAULT 'africastalking',
    api_key TEXT,
    api_username VARCHAR(100),
    sender_id VARCHAR(50),
    default_currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Policies for Business Settings
CREATE POLICY "Super Admin access all settings" ON public.business_settings
FOR ALL USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Business Admin manages own settings" ON public.business_settings
FOR ALL USING (business_id = public.get_current_user_business_id())
WITH CHECK (business_id = public.get_current_user_business_id());

-- Automatically seed settings row when a business is created
CREATE OR REPLACE FUNCTION public.seed_default_business_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.business_settings (business_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_seed_business_settings
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_business_settings();