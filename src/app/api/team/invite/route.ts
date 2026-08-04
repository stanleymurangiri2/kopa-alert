import { NextRequest, NextResponse } from 'next/server';
import { inviteMember } from '@/lib/team/invite-member';
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { name, email, role } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
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
      error: authTokenError,
    } = await supabase.auth.getUser(token);

    if (authTokenError || !user) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (requesterError || !requester) {
      return NextResponse.json(
        { success: false, message: 'Requester not found.' },
        { status: 404 }
      );
    }

    if (requester.role !== 'business_admin' && requester.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Permission denied.' },
        { status: 403 }
      );
    }

    const result = await inviteMember({
      businessId: requester.business_id,
      name,
      email,
      role,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}