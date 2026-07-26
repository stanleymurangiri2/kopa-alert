import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

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
}

// Generate a temporary password if none is provided
function generateTemporaryPassword() {
  return `Kopa@${Math.random().toString(36).slice(-8)}A1`;
}

export async function approveBusiness({
  requestId,
  temporaryPassword,
}: ApproveBusinessInput): Promise<ApproveBusinessResult> {
  try {
    // ------------------------------------------------------------------
    // Validate input
    // ------------------------------------------------------------------

    if (!requestId) {
      return {
        success: false,
        message: 'Request ID is required.',
      };
    }

    const password = temporaryPassword || generateTemporaryPassword();

    // ------------------------------------------------------------------
    // Get pending registration request
    // ------------------------------------------------------------------

    const { data: request, error: requestError } = await supabase
      .from('business_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle<BusinessRequest>();

    if (requestError) {
      return {
        success: false,
        message: requestError.message,
      };
    }

    if (!request) {
      return {
        success: false,
        message: 'Business request not found.',
      };
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        message: 'Business request has already been processed.',
      };
    }

    // ------------------------------------------------------------------
    // Create Business first
    // ------------------------------------------------------------------

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

    // ------------------------------------------------------------------
    // Create Supabase Auth user
    // ------------------------------------------------------------------

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
      // Rollback business
      await supabase.from('businesses').delete().eq('id', business.id);

      return {
        success: false,
        message: authError?.message || 'Unable to create authentication user.',
      };
    }

    const authUserId = authData.user.id;

    // ------------------------------------------------------------------
    // Create public.users profile
    // ------------------------------------------------------------------

    const { error: userError } = await supabase.from('users').insert({
      id: authUserId,
      business_id: business.id,
      role: 'business_admin',
      name: request.owner_name,
      email: request.email,
    });

    if (userError) {
      // Rollback everything
      await supabase.from('businesses').delete().eq('id', business.id);
      await supabase.auth.admin.deleteUser(authUserId);

      return {
        success: false,
        message: userError.message,
      };
    }

    // ------------------------------------------------------------------
    // Mark request approved
    // ------------------------------------------------------------------

    const { error: updateError } = await supabase
      .from('business_requests')
      .update({
        status: 'approved',
      })
      .eq('id', requestId);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    // ------------------------------------------------------------------
    // Future integrations
    // ------------------------------------------------------------------
    // await sendWelcomeEmail(request.email, request.owner_name, password);
    // await sendWelcomeSMS(request.phone, password);

    return {
      success: true,
      message: 'Business approved successfully.',
      businessId: business.id,
      userId: authUserId,
      temporaryPassword: password,
    };
  } catch (error) {
    console.error('approveBusiness error:', error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unexpected server error.',
    };
  }
}