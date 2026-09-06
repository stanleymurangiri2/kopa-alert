import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformSettingKey =
  | "resend_limit"
  | "pending_request_auto_expire_days"
  | "audit_log_retention_days";

export async function getPlatformSetting<T>(
  supabase: SupabaseClient,
  key: PlatformSettingKey,
  fallback: T
): Promise<T> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (!data || data.value === null || data.value === undefined) {
    return fallback;
  }

  return data.value as T;
}
