import { createClient } from '@/lib/supabase/client';

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  national_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerFormData {
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  national_id?: string;
  notes?: string;
}

const supabase = createClient();

/**
 * Get all customers for the logged-in business
 */
export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Customer[];
}

/**
 * Get a single customer
 */
export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }

    throw new Error(error.message);
  }

  return data as Customer;
}

/**
 * Create customer
 */
export async function createCustomer(
  customer: CustomerFormData
): Promise<Customer> {
  const payload = {
    full_name: customer.full_name.trim(),
    phone: customer.phone.trim(),
    email: customer.email?.trim().toLowerCase() || null,
    address: customer.address?.trim() || null,
    national_id: customer.national_id?.trim() || null,
    notes: customer.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Customer;
}

/**
 * Update customer
 */
export async function updateCustomer(
  id: string,
  customer: CustomerFormData
): Promise<Customer> {
  const payload = {
    full_name: customer.full_name.trim(),
    phone: customer.phone.trim(),
    email: customer.email?.trim().toLowerCase() || null,
    address: customer.address?.trim() || null,
    national_id: customer.national_id?.trim() || null,
    notes: customer.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Customer;
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Search customers
 */
export async function searchCustomers(
  keyword: string
): Promise<Customer[]> {
  const query = keyword.trim();

  if (!query) {
    return getCustomers();
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(
      `full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Customer[];
}