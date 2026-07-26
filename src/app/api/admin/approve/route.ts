import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { requestId, password } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing requestId." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Temporary password is required." },
        { status: 400 }
      );
    }

    //--------------------------------------------------------
    // Load registration request
    //--------------------------------------------------------

    const { data: registration, error: requestError } =
      await supabase
        .from("business_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (requestError || !registration) {
      return NextResponse.json(
        {
          error: "Registration request not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (registration.status !== "pending") {
      return NextResponse.json(
        {
          error: "This request has already been processed.",
        },
        {
          status: 400,
        }
      );
    }

    //--------------------------------------------------------
    // Create Auth User
    //--------------------------------------------------------

    const {
      data: authUser,
      error: authError,
    } = await supabase.auth.admin.createUser({
      email: registration.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: registration.owner_name,
      },
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ??
            "Failed to create authentication user.",
        },
        {
          status: 500,
        }
      );
    }

    //--------------------------------------------------------
    // Generate activation token
    //--------------------------------------------------------

    const activationToken = randomUUID();

    //--------------------------------------------------------
    // Approve business inside PostgreSQL transaction
    //--------------------------------------------------------

    const { data, error } = await supabase.rpc(
      "approve_business_request",
      {
        p_request_id: requestId,
        p_auth_user_id: authUser.user.id,
        p_activation_token: activationToken,
      }
    );

    if (error) {
      await supabase.auth.admin.deleteUser(authUser.user.id);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    //--------------------------------------------------------
    // Success
    //--------------------------------------------------------

    return NextResponse.json({
      success: true,
      message: "Business approved successfully.",
      activationToken,
      business: data,
    });

  } catch (error) {
    console.error("Approve business error:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}