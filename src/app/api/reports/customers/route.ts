import { NextRequest, NextResponse } from "next/server";

import { getCustomerReports } from "@/lib/reports/customers";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";


export async function GET(request: NextRequest) {
  try {
    // -------------------------------------------------------
    // Authenticate user
    // -------------------------------------------------------

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // -------------------------------------------------------
    // Load user profile
    // -------------------------------------------------------

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("users")
        .select("business_id, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.business_id) {
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

    if (profile.role !== "business_admin" && profile.role !== "super_admin") {
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

    const result = await getCustomerReports(
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
      "Customer reports API error:",
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