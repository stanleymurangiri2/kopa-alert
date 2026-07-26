import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface RemoveMemberInput {
  requesterId: string;
  userId: string;
  deleteAuthUser?: boolean;
}

export interface RemoveMemberResult {
  success: boolean;
  message: string;
}

export async function removeMember({
  requesterId,
  userId,
  deleteAuthUser = true,
}: RemoveMemberInput): Promise<RemoveMemberResult> {
  // -------------------------------------------------------
  // Requester
  // -------------------------------------------------------

  const { data: requester, error: requesterError } = await supabase
    .from("users")
    .select("id, business_id, role")
    .eq("id", requesterId)
    .single();

  if (requesterError || !requester) {
    return {
      success: false,
      message: "Requester not found.",
    };
  }

  // -------------------------------------------------------
  // Authorization
  // -------------------------------------------------------

  if (
    requester.role !== "business_admin" &&
    requester.role !== "super_admin"
  ) {
    return {
      success: false,
      message: "Permission denied.",
    };
  }

  // -------------------------------------------------------
  // Target User
  // -------------------------------------------------------

  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("id, business_id, role")
    .eq("id", userId)
    .single();

  if (targetError || !target) {
    return {
      success: false,
      message: "User not found.",
    };
  }

  // -------------------------------------------------------
  // Prevent self deletion
  // -------------------------------------------------------

  if (requester.id === target.id) {
    return {
      success: false,
      message: "You cannot remove your own account.",
    };
  }

  // -------------------------------------------------------
  // Business Admin restrictions
  // -------------------------------------------------------

  if (requester.role === "business_admin") {
    if (requester.business_id !== target.business_id) {
      return {
        success: false,
        message: "You can only manage users in your own business.",
      };
    }

    if (target.role === "super_admin") {
      return {
        success: false,
        message: "You cannot remove a Super Admin.",
      };
    }
  }

  // -------------------------------------------------------
  // Delete public.users record
  // -------------------------------------------------------

  const { error: deleteProfileError } = await supabase
    .from("users")
    .delete()
    .eq("id", target.id);

  if (deleteProfileError) {
    return {
      success: false,
      message: deleteProfileError.message,
    };
  }

  // -------------------------------------------------------
  // Delete auth.users account (optional)
  // -------------------------------------------------------

  if (deleteAuthUser) {
    const { error: deleteAuthError } =
      await supabase.auth.admin.deleteUser(target.id);

    if (deleteAuthError) {
      return {
        success: false,
        message: deleteAuthError.message,
      };
    }
  }

  // -------------------------------------------------------
  // Future enhancements
  // -------------------------------------------------------
  // • Audit log
  // • Send notification email
  // • Send SMS notification
  // • Soft delete instead of permanent delete
  // -------------------------------------------------------

  return {
    success: true,
    message: "Team member removed successfully.",
  };
}