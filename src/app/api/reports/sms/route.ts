import { NextRequest, NextResponse } from "next/server";

import { getSmsReports } from "@/lib/reports/sms";
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
    // Load user profile
    // -------------------------------------------------------

    const { data: profile, error: profileError } =
      await supabase
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

    const allowedRoles = [
      "super_admin",
      "business_admin",
      
    ];

    if (!allowedRoles.includes(profile.role)) {
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
    // Query parameters
    // -------------------------------------------------------

    const { searchParams } = new URL(request.url);

    const startDate =
      searchParams.get("startDate") ?? undefined;

    const endDate =
      searchParams.get("endDate") ?? undefined;

    // -------------------------------------------------------
    // Generate report
    // -------------------------------------------------------

    const result = await getSmsReports(
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
      "SMS Reports API Error:",
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