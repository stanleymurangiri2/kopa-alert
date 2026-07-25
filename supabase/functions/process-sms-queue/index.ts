// @ts-nocheck - Bypasses Node.js TypeScript validation for Deno Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch queued SMS records needing dispatch
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("sms_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .limit(50);

    if (fetchError) throw fetchError;

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(
        JSON.stringify({ status: "idle", message: "No pending messages." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let failureCount = 0;

    // 2. Process queue items
    for (const msg of pendingMessages) {
      const { data: settings } = await supabase
        .from("business_settings")
        .select("api_key, api_username, sender_id")
        .eq("business_id", msg.business_id)
        .single();

      const apiKey = settings?.api_key || Deno.env.get("AT_API_KEY");
      const username = settings?.api_username || Deno.env.get("AT_USERNAME");

      if (!apiKey || !username) {
        await supabase
          .from("sms_queue")
          .update({
            status: "failed",
            error_log: "Missing Africa's Talking API credentials.",
          })
          .eq("id", msg.id);
        failureCount++;
        continue;
      }

      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("to", msg.phone_number);
      formData.append("message", msg.message);
      if (settings?.sender_id) formData.append("from", settings.sender_id);

      const atEndpoint =
        username === "sandbox"
          ? "https://api.sandbox.africastalking.com/version1/messaging"
          : "https://api.africastalking.com/version1/messaging";

      const response = await fetch(atEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: apiKey,
        },
        body: formData,
      });

      const resData = await response.json();

      if (
        response.ok &&
        resData.SMSMessageData?.Recipients?.[0]?.status === "Success"
      ) {
        await supabase
          .from("sms_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);
        successCount++;
      } else {
        const attempts = (msg.attempts || 0) + 1;
        await supabase
          .from("sms_queue")
          .update({
            attempts,
            status: attempts >= 3 ? "failed" : "pending",
            error_log: JSON.stringify(resData),
          })
          .eq("id", msg.id);
        failureCount++;
      }
    }

    return new Response(
      JSON.stringify({
        status: "completed",
        processed: pendingMessages.length,
        successCount,
        failureCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});