import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export type Customer = {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  is_blacklisted?: boolean | null;
  blacklisted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getCustomers() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: null };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  let query = supabase
    .from('customers')
    .select('*')
    .order('full_name', { ascending: true });

  if (profile?.business_id) {
    query = query.eq('business_id', profile.business_id);
  }

  const { data, error } = await query;

  return { data, error };
}

export async function getCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

export async function createCustomer(
  customer: Omit<
    Customer,
    'id' | 'is_blacklisted' | 'blacklisted_at' | 'created_at' | 'updated_at'
  >
) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();

  return { data, error };
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id);

  return { error };
}