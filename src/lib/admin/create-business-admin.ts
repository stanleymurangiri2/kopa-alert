import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CreateBusinessAdminInput {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  temporaryPassword: string;
}

export interface CreateBusinessAdminResult {
  success: boolean;
  message: string;
  userId?: string;
}

export async function createBusinessAdmin({
  businessId,
  name,
  email,
  phone,
  temporaryPassword,
}: CreateBusinessAdminInput): Promise<CreateBusinessAdminResult> {
  // ---------------------------------------------------------
  // Ensure email is not already registered
  // ---------------------------------------------------------

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return {
      success: false,
      message: 'A user with this email already exists.',
    };
  }

  // ---------------------------------------------------------
  // Create Supabase Auth account
  // ---------------------------------------------------------

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone,
      },
    });

  if (authError || !authData.user) {
    return {
      success: false,
      message:
        authError?.message ?? 'Failed to create authentication account.',
    };
  }

  // ---------------------------------------------------------
  // Create application user profile
  // ---------------------------------------------------------

  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      business_id: businessId,
      name,
      email,
      role: 'business_admin',
    });

  if (profileError) {
    // Roll back the Auth account
    await supabase.auth.admin.deleteUser(authData.user.id);

    return {
      success: false,
      message: profileError.message,
    };
  }

  return {
    success: true,
    message: 'Business administrator created successfully.',
    userId: authData.user.id,
  };
}