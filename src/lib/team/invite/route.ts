import { NextRequest, NextResponse } from 'next/server';
import { inviteMember } from '@/lib/team/invite-member';
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";


export async function POST(request: NextRequest) {
  try {
    const {
      requesterId,
      name,
      email,
      role,
      temporaryPassword,
    } = await request.json();

    // -------------------------------------------------------
    // Validate input
    // -------------------------------------------------------

    if (
      !requesterId ||
      !name ||
      !email ||
      !role ||
      !temporaryPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields.',
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Verify requester
    // -------------------------------------------------------

    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', requesterId)
      .single();

    if (requesterError || !requester) {
      return NextResponse.json(
        {
          success: false,
          message: 'Requester not found.',
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // Only Business Admins can invite users
    // -------------------------------------------------------

    if (requester.role !== 'business_admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Permission denied.',
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------------
    // Invite member
    // -------------------------------------------------------

    const result = await inviteMember({
      businessId: requester.business_id,
      name,
      email,
      role,
      temporaryPassword,
    });

    if (!result.success) {
      return NextResponse.json(result, {
        status: 400,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error.',
      },
      {
        status: 500,
      }
    );
  }
}