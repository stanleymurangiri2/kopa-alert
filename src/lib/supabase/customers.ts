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
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('full_name', { ascending: true });

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