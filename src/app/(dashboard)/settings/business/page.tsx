'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';
import { Loader2 } from 'lucide-react';

type Business = {
  id: string;
  business_name: string;
  business_code: string;
  phone: string;
  email: string;
  status: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  sms_balance: number | null;
  created_at: string;
};

type CreditConfig = {
  defaultCreditLimit: number;
  maxCreditLimit: number;
  reductionPct: number;
  freezeOnSevereOverdue: boolean;
};

export default function BusinessSettingsPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [creditConfig, setCreditConfig] = useState<CreditConfig | null>(null);
  const [creditConfigLoading, setCreditConfigLoading] = useState(true);
  const [creditConfigSaving, setCreditConfigSaving] = useState(false);

  useEffect(() => {
    loadBusiness();
    loadCreditConfig();
  }, []);

  async function loadCreditConfig() {
    try {
      const res = await fetch('/api/credit/config');
      const json = await res.json();
      if (res.ok && json.success) {
        setCreditConfig(json.config);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCreditConfigLoading(false);
    }
  }

  async function saveCreditConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!creditConfig) return;

    setCreditConfigSaving(true);

    try {
      const res = await fetch('/api/credit/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditConfig),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast('error', json.message ?? 'Failed to update credit limit rules.');
        return;
      }

      setCreditConfig(json.config);
      showToast('success', 'Credit limit rules updated successfully.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to update credit limit rules.');
    } finally {
      setCreditConfigSaving(false);
    }
  }

  async function loadBusiness() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (!profile?.business_id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', profile.business_id)
        .single();

      if (data) {
        setBusiness(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();

    if (!business) return;

    setSaving(true);

    const { error } = await supabase
      .from('businesses')
      .update({
        business_name: business.business_name,
        phone: business.phone,
        email: business.email,
      })
      .eq('id', business.id);

    if (error) {
      showToast('error', error.message);
      setSaving(false);
      return;
    }

    showToast('success', 'Business information updated successfully.');
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading business information...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6 text-muted-foreground">
        Business information not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Business Settings
        </h1>

        <p className="text-muted-foreground">
          Manage your business information.
        </p>
      </div>

      <form
        onSubmit={saveBusiness}
        className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm"
      >

        <div>
          <label className="block text-sm font-medium text-foreground">
            Business Name
          </label>

          <input
            type="text"
            value={business.business_name}
            onChange={(e) =>
              setBusiness({
                ...business,
                business_name: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Phone Number
          </label>

          <input
            type="text"
            value={business.phone}
            onChange={(e) =>
              setBusiness({
                ...business,
                phone: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">
            Business Email
          </label>

          <input
            type="email"
            value={business.email}
            onChange={(e) =>
              setBusiness({
                ...business,
                email: e.target.value,
              })
            }
            className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
            required
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Business Code
            </label>

            <input
              type="text"
              value={business.business_code}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Status
            </label>

            <input
              type="text"
              value={business.status}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2 capitalize"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Subscription Tier
            </label>

            <input
              type="text"
              value={business.subscription_tier ?? '—'}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2 capitalize"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Subscription Status
            </label>

            <input
              type="text"
              value={business.subscription_status ?? '—'}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2 capitalize"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground">
              SMS Balance
            </label>

            <input
              type="text"
              value={business.sms_balance !== null ? business.sms_balance.toLocaleString() : '—'}
              readOnly
              className={`mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 font-mono ${
                business.sms_balance !== null && business.sms_balance <= 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            />

            {business.sms_balance !== null && business.sms_balance <= 0 && (
              <p className="mt-1 text-xs text-destructive">
                Balance depleted — SMS reminders will not send until topped up. Contact support to add credits.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Registered On
            </label>

            <input
              type="text"
              value={new Date(
                business.created_at
              ).toLocaleDateString()}
              readOnly
              className="mt-1 w-full rounded-md border border-border bg-muted text-muted-foreground px-3 py-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving
            ? 'Saving...'
            : 'Save Changes'}
        </button>

      </form>

      {!creditConfigLoading && creditConfig && (
        <form
          onSubmit={saveCreditConfig}
          className="mt-6 space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">Credit Limit Rules</h2>
            <p className="text-sm text-muted-foreground">
              Configure how the credit-limit engine recommends limits for your customers.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Default Credit Limit (KES)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={creditConfig.defaultCreditLimit}
                onChange={(e) =>
                  setCreditConfig({ ...creditConfig, defaultCreditLimit: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used for new customers without enough repayment history yet.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Maximum Credit Limit (KES)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={creditConfig.maxCreditLimit}
                onChange={(e) =>
                  setCreditConfig({ ...creditConfig, maxCreditLimit: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Risk Reduction (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={creditConfig.reductionPct}
                onChange={(e) =>
                  setCreditConfig({ ...creditConfig, reductionPct: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-md border border-border bg-card text-foreground px-3 py-2 focus:border-primary focus:outline-none"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                How much to reduce a high-risk customer's recommended limit by.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="freezeOnSevereOverdue"
                checked={creditConfig.freezeOnSevereOverdue}
                onChange={(e) =>
                  setCreditConfig({ ...creditConfig, freezeOnSevereOverdue: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="freezeOnSevereOverdue" className="text-sm text-foreground">
                Restrict new credit for severely overdue customers
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={creditConfigSaving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creditConfigSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {creditConfigSaving ? 'Saving...' : 'Save Credit Limit Rules'}
          </button>
        </form>
      )}

    </div>
  );
}
