import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { customerId, blacklist } = await request.json();

    if (!customerId || typeof blacklist !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Missing customerId or blacklist flag." },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found." },
        { status: 404 }
      );
    }

    if (profile.role !== "business_admin" && profile.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("customers")
      .update({
        is_blacklisted: blacklist,
        blacklisted_at: blacklist ? new Date().toISOString() : null,
      })
      .eq("id", customerId)
      .eq("business_id", profile.business_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Blacklist toggle error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}