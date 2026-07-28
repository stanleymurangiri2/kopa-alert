
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export interface InviteMemberInput {
  businessId: string;
  name: string;
  email: string;
  role: 'business_admin' | 'employee';
  temporaryPassword: string;
}

export interface InviteMemberResult {
  success: boolean;
  message: string;
  userId?: string;
}

export async function inviteMember({
  businessId,
  name,
  email,
  role,
  temporaryPassword,
}: InviteMemberInput): Promise<InviteMemberResult> {
  // ----------------------------------------------------
  // Validate business exists
  // ----------------------------------------------------

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    return {
      success: false,
      message: 'Business not found.',
    };
  }

  // ----------------------------------------------------
  // Prevent duplicate users
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // Create Auth account
  // ----------------------------------------------------

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

  if (authError || !authData.user) {
    return {
      success: false,
      message:
        authError?.message ?? 'Failed to create authentication account.',
    };
  }

  // ----------------------------------------------------
  // Create public.users record
  // ----------------------------------------------------

  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      business_id: businessId,
      name,
      email,
      role,
    });

  if (profileError) {
    // Roll back Auth user
    await supabase.auth.admin.deleteUser(authData.user.id);

    return {
      success: false,
      message: profileError.message,
    };
  }

  // ----------------------------------------------------
  // Future integrations
  // ----------------------------------------------------
  // await sendInvitationEmail(...)
  // await sendInvitationSMS(...)
  // await createAuditLog(...)
  // ----------------------------------------------------

  return {
    success: true,
    message: 'Team member invited successfully.',
    userId: authData.user.id,
  };
}