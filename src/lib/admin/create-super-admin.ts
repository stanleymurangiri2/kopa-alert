import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/lib/utils/generate-password";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants/support";

export interface CreateSuperAdminInput {
  name: string;
  email: string;
}

export interface CreateSuperAdminResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
}

export async function createSuperAdmin({
  name,
  email,
}: CreateSuperAdminInput): Promise<CreateSuperAdminResult> {
  const temporaryPassword = generateTemporaryPassword();

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
    business_id: null,
    name,
    email,
    role: 'super_admin',
    must_change_password: true,
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
    const { superAdminInvitationEmail } = await import('@/lib/notifications/email-templates');

    const emailResult = await sendEmail({
      to: email,
      subject: "You've been granted KopaAlert Super Admin access",
      html: superAdminInvitationEmail({
        name,
        login_email: email,
        temporary_password: temporaryPassword,
        login_url: 'https://www.kopaalert.shop/admin/login',
        support_email: SUPPORT_EMAIL,
        support_phone: SUPPORT_PHONE,
      }),
    });

    if (emailResult.success) {
      emailSent = true;
    } else {
      console.error(`[createSuperAdmin] Email failed for ${email}: ${emailResult.error}`);
    }
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error(`[createSuperAdmin] Email failed for ${email}: ${msg}`);
  }

  return {
    success: true,
    message: 'Super admin created successfully.',
    userId: authData.user.id,
    emailSent,
  };
}
