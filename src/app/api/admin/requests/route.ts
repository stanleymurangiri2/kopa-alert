import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify caller user profile and role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userProfile || userProfile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { requestId, action } = body as {
    requestId: string;
    action: 'approve' | 'reject' | 'suspend' | 'activate';
  };

  if (!requestId || !action) {
    return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 });
  }

  // Fetch the business request
  const { data: reqData, error: reqError } = await supabase
    .from('business_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !reqData) {
    return NextResponse.json({ error: 'Business request not found' }, { status: 404 });
  }

  if (action === 'approve') {
    // 1. Create entry in businesses table
    const { data: newBusiness, error: bizError } = await supabase
      .from('businesses')
      .insert([
        {
          business_name: reqData.business_name,
          phone: reqData.phone,
          email: reqData.email,
          status: 'approved',
        },
      ])
      .select()
      .single();

    if (bizError) {
      return NextResponse.json({ error: bizError.message }, { status: 500 });
    }

    // 2. Update request status to approved
    await supabase
      .from('business_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    return NextResponse.json({
      message: 'Business approved successfully',
      business: newBusiness,
    });
  }

  if (action === 'reject') {
    await supabase
      .from('business_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    return NextResponse.json({ message: 'Request rejected' });
  }

  if (action === 'suspend' || action === 'activate') {
    const targetStatus = action === 'suspend' ? 'suspended' : 'approved';

    // Update both business_requests and businesses table status if existing
    await supabase
      .from('business_requests')
      .update({ status: targetStatus })
      .eq('id', requestId);

    await supabase
      .from('businesses')
      .update({ status: targetStatus })
      .eq('email', reqData.email);

    return NextResponse.json({ message: `Business status updated to ${targetStatus}` });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}