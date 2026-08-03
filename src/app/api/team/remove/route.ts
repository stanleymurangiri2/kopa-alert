import { NextRequest, NextResponse } from "next/server";
import { removeMember } from "@/lib/team/remove-member";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, deleteAuthUser = true } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // Verify requester via auth token, not request body
    // -------------------------------------------------------

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

    const requesterId = user.id;

    // -------------------------------------------------------
    // Remove member
    // -------------------------------------------------------

    const result = await removeMember({
      requesterId,
      userId,
      deleteAuthUser,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}