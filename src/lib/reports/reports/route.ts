import { NextRequest, NextResponse } from "next/server";
import { getPaymentReports } from "@/lib/reports/payments";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";


export async function GET(request: NextRequest) {
  try {
    // -------------------------------------------------------
    // Authenticate user
    // -------------------------------------------------------

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authentication token.",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------------
    // Get user profile
    // -------------------------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          message: "User profile not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // Authorization
    // -------------------------------------------------------

    if (
      ![
        "super_admin",
        "business_admin",
        "employee",
      ].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied.",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------------
    // Read query parameters
    // -------------------------------------------------------

    const { searchParams } = new URL(request.url);

    const startDate =
      searchParams.get("startDate") ?? undefined;

    const endDate =
      searchParams.get("endDate") ?? undefined;

    // -------------------------------------------------------
    // Generate report
    // -------------------------------------------------------

    const result = await getPaymentReports(
      profile.business_id,
      startDate,
      endDate
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: 400,
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error(
      "Payment reports API error:",
      error
    );

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