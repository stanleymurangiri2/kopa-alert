import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import crypto from 'crypto';

// Types
type BusinessRequest = {
  id: string;
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
};

export interface ApproveBusinessInput {
  requestId: string;
  temporaryPassword?: string;
}

export interface ApproveBusinessResult {
  success: boolean;
  message: string;
  businessId?: string;
  userId?: string;
  temporaryPassword?: string;
  emailSent?: boolean;
}

// Generate a temporary password if none is provided
function generateTemporaryPassword() {
  // crypto.randomBytes instead of Math.random — not predictable
  const randomPart = crypto.randomBytes(6).toString('base64url'); // 8 chars, URL-safe
  return `Kopa@${randomPart}A1`;
}

export async function approveBusiness({
  requestId,
  temporaryPassword,
}: ApproveBusinessInput): Promise<ApproveBusinessResult> {
  try {
    if (!requestId) {
      return { success: false, message: 'Request ID is required.' };
    }

    const password = temporaryPassword || generateTemporaryPassword();

    const { data: request, error: requestError } = await supabase
      .from('business_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle<BusinessRequest>();

    if (requestError) {
      return { success: false, message: requestError.message };
    }
    if (!request) {
      return { success: false, message: 'Business request not found.' };
    }
    if (request.status !== 'pending') {
      return { success: false, message: 'Business request has already been processed.' };
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        business_name: request.business_name,
        phone: request.phone,
        email: request.email,
        status: 'approved',
      })
      .select()
      .single();

    if (businessError || !business) {
      return {
        success: false,
        message: businessError?.message || 'Unable to create business.',
      };
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: request.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: request.owner_name,
          business_id: business.id,
        },
      });

    if (authError || !authData.user) {
      await supabase.from('businesses').delete().eq('id', business.id);
      return {
        success: false,
        message: authError?.message || 'Unable to create authentication user.',
      };
    }

    const authUserId = authData.user.id;

    const { error: userError } = await supabase.from('users').insert({
      id: authUserId,
      business_id: business.id,
      role: 'business_admin',
      name: request.owner_name,
      email: request.email,
    });

    if (userError) {
      await supabase.from('businesses').delete().eq('id', business.id);
      await supabase.auth.admin.deleteUser(authUserId);
      return { success: false, message: userError.message };
    }

    const { error: updateError } = await supabase
      .from('business_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    // ------------------------------------------------------------------
    // Send approval email via Resend — failure here does NOT roll back
    // the approval. Business is live either way; email is best-effort.
    // ------------------------------------------------------------------

    let emailSent = false;
    try {
      const { sendEmail } = await import('@/lib/notifications/resend');
      const { approvalEmail } = await import('@/lib/notifications/email-templates');

      await sendEmail({
        to: request.email,
        subject: 'Your KopaAlert Business Account is Approved!',
        html: approvalEmail({
          owner_name: request.owner_name,
          business_name: request.business_name,
          business_code: business.business_code, // adjust field name if different
          temporary_password: password,
          login_url: 'https://kopa-alert.vercel.app/login',
          support_email: 'solutiontechcampany@gmail.com',
          support_phone: '+254740305253',
        }),
      });

      emailSent = true;
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error(`[approveBusiness] Email failed for ${request.email}: ${msg}`);
      // deliberately not re-thrown — approval already succeeded
    }

    return {
      success: true,
      message: 'Business approved successfully.',
      businessId: business.id,
      userId: authUserId,
      temporaryPassword: password,
      emailSent,
    };
  } catch (error) {
    console.error('approveBusiness error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected server error.',
    };
  }
}