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
  status: "pending" | "sent" | "failed" | "cancelled";
  attempts: number;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
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
 * Get pending notifications — CRON ONLY, uses admin client to bypass RLS
 * (no authenticated user session exists when the cron route calls this)
 */
export async function getPendingNotifications() {
  return supabaseAdmin
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("created_at", {
      ascending: true,
    });
}

/**
 * Mark notification as sent — CRON ONLY, admin client
 */
export async function markNotificationSent(id: string) {
  return supabaseAdmin
    .from("notification_queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      error_message: null,
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