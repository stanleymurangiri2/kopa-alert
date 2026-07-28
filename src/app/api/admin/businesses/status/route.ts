import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  
  const { id, status } = await request.json();

  const { error } = await supabase
    .from("businesses")
    .update({
      status,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  await supabase.from("audit_logs").insert({
    action:
      status === "approved"
        ? "ACTIVATE_BUSINESS"
        : "SUSPEND_BUSINESS",
    target_type: "business",
    target_id: id,
    description: `Business status changed to ${status}`,
  });

  return NextResponse.json({
    success: true,
  });
}