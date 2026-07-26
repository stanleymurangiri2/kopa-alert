import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendApprovalEmail } from "@/lib/email/sendApprovalEmail";

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

    // Get the pending request
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
        { error: "Request has already been processed." },
        { status: 400 }
      );
    }

    // Create Business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        business_name: requestData.business_name,
        phone: requestData.phone,
        email: requestData.email,
        status: "approved",
      })
      .select()
      .single();

    if (businessError) {
      return NextResponse.json(
        { error: businessError.message },
        { status: 500 }
      );
    }

    
    // Create and invite Business Admin
const { data: authUser, error: authError } =
  await supabase.auth.admin.inviteUserByEmail(requestData.email, {
    data: {
      full_name: requestData.owner_name,
      business_id: business.id,
      role: "business_admin",
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

if (authError || !authUser.user) {
  // Roll back the business record
  await supabase
    .from("businesses")
    .delete()
    .eq("id", business.id);

  return NextResponse.json(
    {
      error: authError?.message || "Failed to invite user.",
    },
    {
      status: 500,
    }
    
  );
}
await sendApprovalEmail({
  businessName: business.business_name,
  ownerName: requestData.owner_name,
  email: requestData.email,
});

    // Create User Profile
const { error: profileError } = await supabase
  .from("users")
  .insert({
    id: authUser.user.id,
    business_id: business.id,
    role: "business_admin",
    name: requestData.owner_name,
    email: requestData.email,
  });

if (profileError) {
  // Roll back the auth user
  await supabase.auth.admin.deleteUser(authUser.user.id);

  // Roll back the business
  await supabase
    .from("businesses")
    .delete()
    .eq("id", business.id);

  return NextResponse.json(
    { error: profileError.message },
    { status: 500 }
  );
}

    // Update Request Status
    const { error: updateError } = await supabase
      .from("business_requests")
      .update({
        status: "approved",
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
      message: "Business approved successfully.",
      business,
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