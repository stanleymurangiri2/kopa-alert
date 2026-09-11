import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBusinessCreditConfig, updateBusinessCreditConfig } from "@/lib/supabase/credit";

async function requireBusinessAdmin(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.business_id) {
    return { error: NextResponse.json({ success: false, message: "Profile not found." }, { status: 404 }) } as const;
  }

  if (profile.role !== "business_admin" && profile.role !== "super_admin") {
    return { error: NextResponse.json({ success: false, message: "Access denied." }, { status: 403 }) } as const;
  }

  return { user, businessId: profile.business_id as string } as const;
}

export async function GET(request: NextRequest) {
  const auth = await requireBusinessAdmin(request);
  if ("error" in auth) return auth.error;

  const { data: config, error } = await getBusinessCreditConfig(supabaseAdmin, auth.businessId);

  if (error || !config) {
    return NextResponse.json({ success: false, message: "Failed to load credit configuration." }, { status: 500 });
  }

  return NextResponse.json({ success: true, config });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessAdmin(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const defaultCreditLimit = Number(body?.defaultCreditLimit);
    const maxCreditLimit = Number(body?.maxCreditLimit);
    const reductionPct = Number(body?.reductionPct);
    const freezeOnSevereOverdue = Boolean(body?.freezeOnSevereOverdue);

    if (
      !Number.isFinite(defaultCreditLimit) ||
      !Number.isFinite(maxCreditLimit) ||
      !Number.isFinite(reductionPct) ||
      defaultCreditLimit < 0 ||
      maxCreditLimit < 0 ||
      reductionPct < 0 ||
      reductionPct > 100
    ) {
      return NextResponse.json(
        { success: false, message: "Credit limits must be non-negative and reduction % must be between 0 and 100." },
        { status: 400 }
      );
    }

    if (maxCreditLimit < defaultCreditLimit) {
      return NextResponse.json(
        { success: false, message: "Maximum credit limit must be at least the default credit limit." },
        { status: 400 }
      );
    }

    const { data: config, error } = await updateBusinessCreditConfig(supabaseAdmin, auth.businessId, {
      defaultCreditLimit,
      maxCreditLimit,
      reductionPct,
      freezeOnSevereOverdue,
    });

    if (error || !config) {
      return NextResponse.json({ success: false, message: "Failed to update credit configuration." }, { status: 500 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Credit config update error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
