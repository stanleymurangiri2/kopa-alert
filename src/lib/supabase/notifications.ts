import { createClient } from "./client";
import { supabaseAdmin } from "./admin";

export type NotificationQueueItem = {
  id: string;
  business_id: string;
  debt_id: string;
  customer_id: string;
  channel: "sms" | "whatsapp";
  recipient_phone: string;
  message_body: string;
  scheduled_for: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  attempts: number;
  error_message?: string | null;
  sent_at?: string | null;
  provider_message_id?: string | null;
  created_at: string;
  updated_at?: string;
};

/**
 * Create notification queue item (used from client/dashboard)
 */
export async function createNotification(notification: {
  business_id: string;
  debt_id: string;
  customer_id: string;
  channel?: "sms" | "whatsapp";
  recipient_phone: string;
  message_body: string;
  scheduled_for?: string;
}) {
  const supabase = createClient();
  return supabase
    .from("notification_queue")
    .insert({
      business_id: notification.business_id,
      debt_id: notification.debt_id,
      customer_id: notification.customer_id,
      channel: notification.channel ?? "sms",
      recipient_phone: notification.recipient_phone,
      message_body: notification.message_body,
      scheduled_for:
        notification.scheduled_for ?? new Date().toISOString(),
      status: "pending",
      attempts: 0,
    })
    .select()
    .single();
}

/**
 * Atomically claims every notification eligible to be sent this run - due
 * pending rows, retryable failures under the attempt limit, and any row
 * stuck in 'processing' from a crashed/timed-out previous run - by flipping
 * them to 'processing' in a single UPDATE ... RETURNING. CRON ONLY, admin
 * client bypasses RLS.
 *
 * This is what actually prevents overlapping cron runs from double-sending:
 * a plain SELECT-then-send-then-update has a window where two runs can both
 * see the same rows as eligible. The claim is a single atomic statement, so
 * only one caller can ever successfully claim a given row.
 */
export async function claimNotificationBatch(
  maxAttempts: number
): Promise<{ data: NotificationQueueItem[] | null; error: unknown }> {
  return supabaseAdmin.rpc("claim_notification_batch", {
    p_max_attempts: maxAttempts,
  });
}

/**
 * Mark notification as sent — CRON ONLY, admin client
 */
export async function markNotificationSent(id: string, messageId?: string) {
  return supabaseAdmin
    .from("notification_queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
      provider_message_id: messageId ?? null,
    })
    .eq("id", id);
}

/**
 * Mark notification as failed — CRON ONLY, admin client
 */
export async function markNotificationFailed(
  id: string,
  errorMessage: string
) {
  return supabaseAdmin
    .from("notification_queue")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", id);
}

/**
 * Increment retry attempts — CRON ONLY, admin client
 */
export async function incrementNotificationAttempt(
  id: string,
  currentAttempts: number
) {
  return supabaseAdmin
    .from("notification_queue")
    .update({
      attempts: currentAttempts + 1,
    })
    .eq("id", id);
}

/**
 * Decrement a business's SMS balance by 1 after a successful send — CRON ONLY.
 * Atomic in the database; never goes below 0. Returns the new balance.
 */
export async function decrementSmsBalance(businessId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("decrement_sms_balance", {
    p_business_id: businessId,
  });
  if (error) {
    throw error;
  }
  return data ?? 0;
}

/**
 * Cancel notification (used from client/dashboard)
 */
export async function cancelNotification(id: string) {
  const supabase = createClient();
  return supabase
    .from("notification_queue")
    .update({
      status: "cancelled",
    })
    .eq("id", id);
}

/**
 * Get notifications for a business (used from client/dashboard)
 */
export async function getBusinessNotifications(
  businessId: string
) {
  const supabase = createClient();
  return supabase
    .from("notification_queue")
    .select(`
      *,
      customers (
        full_name,
        phone
      )
    `)
    .eq("business_id", businessId)
    .order("created_at", {
      ascending: false,
    });
}

/**
 * Generate daily reminders — SECURITY DEFINER rpc, safe on either client
 */
export async function generateDailyReminders() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "generate_daily_reminders"
  );
  if (error) {
    throw error;
  }
  return data ?? 0;
}