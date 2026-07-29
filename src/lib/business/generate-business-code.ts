
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function generateBusinessCode(): Promise<string> {
  const { data, error } = await supabase.rpc(
    "generate_business_code"
  );

  if (error) {
    throw error;
  }

  return data;
}