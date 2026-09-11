'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Customer } from '@/types/database.types';
import { createCustomer } from '@/lib/supabase/customers';
import { normalizeKenyanPhone, isValidKenyanPhone } from '@/lib/utils/phone';
import { useToast } from '@/components/ui/ToastProvider';
import { Loader2 } from 'lucide-react';

type CustomerWithCredit = Customer & { available_credit?: number };

const NEW_CUSTOMER_VALUE = '__new__';

export default function NewDebtPage() {
  const [customers, setCustomers] = useState<CustomerWithCredit[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    amount: '',
    description: '',
    payment_instructions: '',
    due_date: '',
    apply_credit: false,
  });
  const [newCustomer, setNewCustomer] = useState({ full_name: '', phone: '', email: '' });
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchCustomers() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Authentication required.');
        setLoadingCustomers(false);
        return;
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

      if (error) {
        setError('Failed to fetch customers.');
      } else if (data) {
        setCustomers(data);
        setFormData((prev) => ({
          ...prev,
          customer_id: data.length > 0 ? data[0].id : NEW_CUSTOMER_VALUE,
        }));
      }
      setLoadingCustomers(false);
    }

    fetchCustomers();
  }, [supabase]);

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);
  const availableCredit = Number(selectedCustomer?.available_credit ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid debt amount greater than 0.');
      setSubmitting(false);
      return;
    }

    const isNewCustomer = formData.customer_id === NEW_CUSTOMER_VALUE;

    if (isNewCustomer && !isValidKenyanPhone(newCustomer.phone)) {
      setError(
        "Enter the customer's real Kenyan mobile number (e.g. 0740305253) - not a placeholder like 0700000000."
      );
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Authentication required');
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      setError('Missing business credentials.');
      setSubmitting(false);
      return;
    }

    let customerId = formData.customer_id;

    if (isNewCustomer) {
      const { data: createdCustomer, error: createError } = await createCustomer({
        business_id: profile.business_id,
        full_name: newCustomer.full_name.trim(),
        phone: normalizeKenyanPhone(newCustomer.phone),
        email: newCustomer.email.trim() || null,
      });

      if (createError || !createdCustomer) {
        setError(createError?.message ?? 'Failed to create customer.');
        setSubmitting(false);
        return;
      }

      customerId = createdCustomer.id;
    }

    const { data: result, error: rpcError } = await supabase.rpc(
      'create_debt_with_credit',
      {
        p_business_id: profile.business_id,
        p_customer_id: customerId,
        p_amount: numericAmount,
        p_due_date: formData.due_date,
        p_description: formData.description.trim(),
        p_apply_credit: formData.apply_credit,
        p_payment_instructions: formData.payment_instructions.trim() || null,
        p_created_by: user.id,
      }
    );

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    if (result?.credit_applied > 0) {
      showToast(
        'success',
        `KES ${Number(result.credit_applied).toLocaleString()} of available credit was applied to this loan.`
      );
    }

    router.push('/debts');
    router.refresh();
  };

  if (loadingCustomers) {
    return <div className="p-6 text-muted-foreground">Loading customers list...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Record New Debt</h1>
        <Link href="/debts" className="text-sm text-muted-foreground hover:underline">
          Cancel
        </Link>
      </div>

      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Select Customer</label>
              <select
                required
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value, apply_credit: false })
                }
                className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
              >
                {customers.length === 0 && (
                  <option value="" disabled>
                    No customers yet
                  </option>
                )}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone})
                  </option>
                ))}
                <option value={NEW_CUSTOMER_VALUE}>+ Add New Customer</option>
              </select>
            </div>

            {formData.customer_id === NEW_CUSTOMER_VALUE && (
              <div className="space-y-4 rounded-md border border-border bg-accent/30 p-3">
                <div>
                  <label className="block text-sm font-medium text-foreground">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.full_name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, full_name: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
                    placeholder="Stanley Murangiri"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
                    placeholder="0740305253 or +254740305253"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Email <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
                    placeholder="stanleymurangiri2@gmail.com"
                  />
                </div>
              </div>
            )}

            {availableCredit > 0 && (
              <div className="rounded-md border border-success/30 bg-success/10 p-3">
                <label className="flex items-center gap-2 text-sm text-success">
                  <input
                    type="checkbox"
                    checked={formData.apply_credit}
                    onChange={(e) =>
                      setFormData({ ...formData, apply_credit: e.target.checked })
                    }
                  />
                  Apply available credit (KES {availableCredit.toLocaleString()}) to this loan
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground">Debt Amount (KES)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Due Date</label>
              <input
                type="date"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Description / Items</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
                placeholder="Goods taken on credit (e.g., 2 bags of cement)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Payment Instructions <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.payment_instructions}
                onChange={(e) =>
                  setFormData({ ...formData, payment_instructions: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-border bg-card text-foreground rounded-md text-sm focus:ring-primary focus:border-primary"
                placeholder="Pay via M-Pesa Till 123456"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-teal hover:bg-teal/90 text-teal-foreground font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Recording Debt...' : 'Record Debt'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
