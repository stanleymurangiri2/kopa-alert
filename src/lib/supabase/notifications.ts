import { createClient } from "./client";

export type NotificationQueueItem = {
  id: string;
  business_id: string;
  debt_id: string;
  customer_id: string;
  channel: "sms" | "whatsapp";
  recipient_phone: string;
  message_body: string;
  scheduled_for: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  attempts: number;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
};

/**
 * Create notification queue item
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
 * Get pending notifications
 */
export async function getPendingNotifications() {
  const supabase = createClient();

  return supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("created_at", {
      ascending: true,
    });
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(id: string) {
  const supabase = createClient();

  return supabase
    .from("notification_queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id);
}

/**
 * Mark notification as failed
 */
export async function markNotificationFailed(
  id: string,
  errorMessage: string
) {
  const supabase = createClient();

  return supabase
    .from("notification_queue")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", id);
}

/**
 * Increment retry attempts
 */
export async function incrementNotificationAttempt(
  id: string,
  currentAttempts: number
) {
  const supabase = createClient();

  return supabase
    .from("notification_queue")
    .update({
      attempts: currentAttempts + 1,
    })
    .eq("id", id);
}

/**
 * Cancel notification
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
 * Get notifications for a business
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
 * Generate daily reminders
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