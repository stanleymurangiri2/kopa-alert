import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateRole } from "@/lib/team/update-role";

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { requesterId, userId, role } = await request.json();

    // -------------------------------------------------------
    // Validate input
    // -------------------------------------------------------

    if (!requesterId || !userId || !role) {
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

    if (!["business_admin", "employee"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid role.",
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
    // Update role
    // -------------------------------------------------------

    const result = await updateRole({
      requesterId,
      userId,
      role,
    });

    if (!result.success) {
      return NextResponse.json(result, {
        status: 400,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update role error:", error);

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