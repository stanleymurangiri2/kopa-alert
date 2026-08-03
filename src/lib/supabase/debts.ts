export type Debt = {
  id: string;
  business_id: string;
  customer_id: string;
  amount: number;
  amount_paid: number;
  description: string;
  payment_instructions: string | null;
  due_date: string;
  status: 'pending' | 'partially_paid' | 'fully_paid' | 'overdue';
  created_at?: string;
  updated_at?: string;
};

export async function getDebts() {
  const { data, error } = await supabase
    .from('debts')
    .select(
      `
      *,
      customers (
        id,
        full_name,
        phone
      )
      `
    )
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function getDebtById(id: string) {
  const { data, error } = await supabase
    .from('debts')
    .select(
      `
      *,
      customers (
        id,
        full_name,
        phone,
        email
      )
      `
    )
    .eq('id', id)
    .single();

  return { data, error };
}

export async function createDebt(
  debt: Omit<
    Debt,
    'id' | 'amount_paid' | 'status' | 'created_at' | 'updated_at'
  >
) {
  const { data, error } = await supabase
    .from('debts')
    .insert({
      ...debt,
      amount_paid: 0,
      status: 'pending',
    })
    .select()
    .single();

  return { data, error };
}

export async function updateDebt(
  id: string,
  updates: Partial<Debt>
) {
  const { data, error } = await supabase
    .from('debts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function deleteDebt(id: string) {
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id);

  return { error };
}

export async function getCustomersForDebt() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name')
    .order('full_name');

  return { data, error };
}

export async function recordPayment(
  debtId: string,
  businessId: string,
  amount: number,
  paymentMethod: string,
  notes?: string
) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      debt_id: debtId,
      business_id: businessId,
      amount_paid: amount,
      payment_method: paymentMethod,
      notes: notes ?? null,
    })
    .select()
    .single();

  return { data, error };
}
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export async function addToDebt(
  debtId: string,
  additionalAmount: number,
  newDueDate: string
) {
  const { data: current, error: fetchError } = await supabase
    .from('debts')
    .select('amount, amount_paid, business_id, customer_id, description')
    .eq('id', debtId)
    .single();

  if (fetchError || !current) {
    return { data: null, error: fetchError };
  }

  const newAmount = Number(current.amount) + additionalAmount;
  const newStatus =
    Number(current.amount_paid) >= newAmount ? 'fully_paid' : 'partially_paid';

  const { data, error } = await supabase
    .from('debts')
    .update({
      amount: newAmount,
      due_date: newDueDate,
      status: newStatus,
    })
    .eq('id', debtId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Notify customer of the top-up
  const { data: customer } = await supabase
    .from('customers')
    .select('full_name, phone')
    .eq('id', current.customer_id)
    .single();

  const { data: business } = await supabase
    .from('businesses')
    .select('business_name')
    .eq('id', current.business_id)
    .single();

  if (customer && business) {
    const balance = newAmount - Number(current.amount_paid);

    await supabase.from('notification_queue').insert({
      business_id: current.business_id,
      debt_id: debtId,
      customer_id: current.customer_id,
      channel: 'sms',
      recipient_phone: customer.phone,
      message_body: `Dear ${customer.full_name}, KES ${additionalAmount} has been added to your debt with ${business.business_name}. New balance: KES ${balance}. New due date: ${newDueDate}.`,
      scheduled_for: new Date().toISOString(),
      status: 'pending',
    });
  }

  return { data, error: null };
}