import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
    }

    let query = supabase.from("debts").select("*, customers(full_name, phone)").order("created_at", { ascending: false });
    if (profile.role !== "super_admin" && profile.business_id) {
      query = query.eq("business_id", profile.business_id);
    }

    const { data: debts, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, debts });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, customer_id, amount, description, due_date, payment_instructions } = body;

    if (!business_id || !customer_id || !amount || !due_date || !description) {
      return NextResponse.json({ success: false, message: "Missing required debt fields" }, { status: 400 });
    }

    const { data: debt, error } = await supabase
      .from("debts")
      .insert({
        business_id,
        customer_id,
        amount,
        amount_paid: 0,
        description,
        due_date,
        payment_instructions,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, debt }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Internal error" }, { status: 500 });
  }
}
