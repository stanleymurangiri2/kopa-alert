import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check request exists
    const { data: requestData, error: requestError } = await supabase
      .from("business_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json(
        { error: "Business request not found." },
        { status: 404 }
      );
    }

    if (requestData.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 400 }
      );
    }

    // Reject the request
    const { error: updateError } = await supabase
      .from("business_requests")
      .update({
        status: "rejected",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Business request rejected successfully.",
    });
  } catch (error) {
    console.error(error);

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