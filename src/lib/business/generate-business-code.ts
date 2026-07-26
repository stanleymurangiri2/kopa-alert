import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateBusinessCode(): Promise<string> {
  const { data, error } = await supabase.rpc(
    "generate_business_code"
  );

  if (error) {
    throw error;
  }

  return data;
}