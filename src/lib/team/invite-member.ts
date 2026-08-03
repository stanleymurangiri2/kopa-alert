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
  emailSent?: boolean;
}

export async function inviteMember({
  businessId,
  name,
  email,
  role,
  temporaryPassword,
}: InviteMemberInput): Promise<InviteMemberResult> {
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, business_name')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    return { success: false, message: 'Business not found.' };
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    return { success: false, message: 'A user with this email already exists.' };
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

  if (authError || !authData.user) {
    return {
      success: false,
      message: authError?.message ?? 'Failed to create authentication account.',
    };
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    business_id: businessId,
    name,
    email,
    role,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, message: profileError.message };
  }

  // ----------------------------------------------------
  // Send invitation email — failure here does NOT roll back
  // the account. Account is live either way; email is best-effort.
  // ----------------------------------------------------

  let emailSent = false;
  try {
    const { sendEmail } = await import('@/lib/notifications/resend');
    const { invitationEmail } = await import('@/lib/notifications/email-templates');

    await sendEmail({
      to: email,
      subject: `You've been added to ${business.business_name} on KopaAlert`,
      html: invitationEmail({
        name,
        business_name: business.business_name,
        role,
        login_email: email,
        temporary_password: temporaryPassword,
        login_url: 'https://kopa-alert.vercel.app/login',
        support_email: 'solutiontechcampany@gmail.com',
        support_phone: '+254740305253',
      }),
    });

    emailSent = true;
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error(`[inviteMember] Email failed for ${email}: ${msg}`);
  }

  return {
    success: true,
    message: 'Team member invited successfully.',
    userId: authData.user.id,
    emailSent,
  };
}