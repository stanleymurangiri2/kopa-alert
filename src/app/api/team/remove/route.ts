import { NextRequest, NextResponse } from "next/server";
import { removeMember } from "@/lib/team/remove-member";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";


export async function POST(request: NextRequest) {
  try {
    const {
      requesterId,
      userId,
      deleteAuthUser = true,
    } = await request.json();

    // -------------------------------------------------------
    // Validate request
    // -------------------------------------------------------

    if (!requesterId || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Verify requester exists
    // -------------------------------------------------------

    const { data: requester, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", requesterId)
      .single();

    if (error || !requester) {
      return NextResponse.json(
        {
          success: false,
          message: "Requester not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // Remove member
    // -------------------------------------------------------

    const result = await removeMember({
      requesterId,
      userId,
      deleteAuthUser,
    });

    if (!result.success) {
      return NextResponse.json(result, {
        status: 400,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Remove member error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}