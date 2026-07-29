import { describe, test, expect } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const hasSupabaseCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const clientUrl = hasSupabaseCredentials
  ? SUPABASE_URL
  : 'https://placeholder.supabase.co';
const clientKey = hasSupabaseCredentials ? SUPABASE_ANON_KEY : 'placeholder';

const describeIfConfigured = hasSupabaseCredentials ? describe : describe.skip;

describeIfConfigured('Phase 10: Multi-Tenant RLS Security Checks', () => {
  const tenantA_JWT = process.env.TEST_TENANT_A_JWT || '';
  const tenantB_JWT = process.env.TEST_TENANT_B_JWT || '';

  const clientA = createClient(clientUrl, clientKey, {
    global: { headers: { Authorization: `Bearer ${tenantA_JWT}` } },
  });

  const clientB = createClient(clientUrl, clientKey, {
    global: { headers: { Authorization: `Bearer ${tenantB_JWT}` } },
  });

  test('Tenant A cannot view Tenant B customers', async () => {
    const { data: tenantBCustomers } = await clientB.from('customers').select('id').limit(1);
    
    if (tenantBCustomers && tenantBCustomers.length > 0) {
      const targetId = tenantBCustomers[0].id;

      const { data } = await clientA
        .from('customers')
        .select('*')
        .eq('id', targetId);

      expect(data).toEqual([]);
    }
  });

  test('Tenant B cannot update Tenant A debt records', async () => {
    const { data: tenantADebts } = await clientA.from('debts').select('id').limit(1);

    if (tenantADebts && tenantADebts.length > 0) {
      const targetDebtId = tenantADebts[0].id;

      const { data } = await clientB
        .from('debts')
        .update({ amount_paid: 99999 })
        .eq('id', targetDebtId)
        .select();

      expect(data).toEqual([]);
    }
  });
});