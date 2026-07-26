import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UpdateRoleInput {
  requesterId: string;
  userId: string;
  role: 'business_admin' | 'employee';
}

export interface UpdateRoleResult {
  success: boolean;
  message: string;
}

export async function updateRole({
  requesterId,
  userId,
  role,
}: UpdateRoleInput): Promise<UpdateRoleResult> {
  // ----------------------------------------------------
  // Get requester
  // ----------------------------------------------------

  const { data: requester, error: requesterError } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', requesterId)
    .single();

  if (requesterError || !requester) {
    return {
      success: false,
      message: 'Requester not found.',
    };
  }

  // ----------------------------------------------------
  // Authorization
  // ----------------------------------------------------

  if (
    requester.role !== 'business_admin' &&
    requester.role !== 'super_admin'
  ) {
    return {
      success: false,
      message: 'Permission denied.',
    };
  }

  // ----------------------------------------------------
  // Get target user
  // ----------------------------------------------------

  const { data: target, error: targetError } = await supabase
    .from('users')
    .select('id, business_id, role')
    .eq('id', userId)
    .single();

  if (targetError || !target) {
    return {
      success: false,
      message: 'User not found.',
    };
  }

  // ----------------------------------------------------
  // Business Admins cannot modify users
  // from another business.
  // ----------------------------------------------------

  if (
    requester.role === 'business_admin' &&
    requester.business_id !== target.business_id
  ) {
    return {
      success: false,
      message: 'You can only manage users in your business.',
    };
  }

  // ----------------------------------------------------
  // Prevent Business Admin from changing
  // Super Admin accounts.
  // ----------------------------------------------------

  if (
    requester.role === 'business_admin' &&
    target.role === 'super_admin'
  ) {
    return {
      success: false,
      message: 'Cannot modify a Super Admin.',
    };
  }

  // ----------------------------------------------------
  // Prevent removing your own admin role.
  // ----------------------------------------------------

  if (
    requesterId === userId &&
    role === 'employee'
  ) {
    return {
      success: false,
      message: 'You cannot remove your own administrator role.',
    };
  }

  // ----------------------------------------------------
  // Update role
  // ----------------------------------------------------

  const { error } = await supabase
    .from('users')
    .update({
      role,
    })
    .eq('id', userId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: 'User role updated successfully.',
  };
}