'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { RiskCategory } from '@/lib/credit/types';

type Assessment = {
  id: string;
  status: 'OK' | 'INSUFFICIENT_DATA' | 'FAILED';
  risk_score: number | null;
  risk_category: RiskCategory;
  current_credit_limit: number;
  recommended_credit_limit: number;
  outstanding_balance: number;
  credit_utilization: number | null;
  reasons: string[];
  model_version: string;
  applied: boolean;
  created_at: string;
};

const RISK_STYLES: Record<RiskCategory, string> = {
  LOW: 'bg-success/10 text-success',
  MODERATE_LOW: 'bg-info/10 text-info',
  MODERATE: 'bg-warning/10 text-warning',
  HIGH: 'bg-destructive/10 text-destructive',
  VERY_HIGH: 'bg-destructive/10 text-destructive',
  INSUFFICIENT_DATA: 'bg-muted text-muted-foreground',
};

const RISK_LABELS: Record<RiskCategory, string> = {
  LOW: 'Low Risk',
  MODERATE_LOW: 'Moderate-Low Risk',
  MODERATE: 'Moderate Risk',
  HIGH: 'High Risk',
  VERY_HIGH: 'Very High Risk',
  INSUFFICIENT_DATA: 'Insufficient Data',
};

export default function CreditRiskCard({
  customerId,
  canManage,
}: {
  customerId: string;
  canManage: boolean;
}) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmingApply, setConfirmingApply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/credit/latest?customerId=${customerId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Failed to load credit assessment.');
        return;
      }
      setAssessment(json.assessment);
    } catch {
      setError('Failed to load credit assessment.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  async function recalculate() {
    setRecalculating(true);
    setError(null);
    try {
      const res = await fetch('/api/credit/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Failed to recalculate.');
        return;
      }
      setAssessment(json.assessment);
    } catch {
      setError('Failed to recalculate.');
    } finally {
      setRecalculating(false);
    }
  }

  async function applyRecommendation() {
    if (!assessment) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/credit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: assessment.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Failed to apply recommendation.');
        return;
      }
      setAssessment(json.assessment);
      setConfirmingApply(false);
    } catch {
      setError('Failed to apply recommendation.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold text-foreground">Credit Limit &amp; Risk Assessment</h2>
        {canManage && (
          <button
            onClick={recalculate}
            disabled={recalculating || loading}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            {recalculating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Recalculate
          </button>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assessment...
          </div>
        ) : error ? (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            Could not calculate risk assessment. {error}
          </p>
        ) : !assessment ? (
          <p className="text-sm text-muted-foreground">No assessment available yet.</p>
        ) : assessment.status === 'FAILED' ? (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            Could not calculate risk assessment for this customer.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${RISK_STYLES[assessment.risk_category]}`}
              >
                {RISK_LABELS[assessment.risk_category]}
              </span>
              <span className="text-sm text-muted-foreground">
                Risk score: <span className="font-mono font-medium text-foreground">{assessment.risk_score ?? '—'}/100</span>
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {assessment.model_version}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-sm text-muted-foreground">Current Limit</div>
                <div className="font-mono text-lg font-bold text-foreground">
                  KES {assessment.current_credit_limit.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Recommended Limit</div>
                <div className="font-mono text-lg font-bold text-foreground">
                  KES {assessment.recommended_credit_limit.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Outstanding Balance</div>
                <div className="font-mono text-lg font-bold text-foreground">
                  KES {assessment.outstanding_balance.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Credit Utilization</div>
                <div className="font-mono text-lg font-bold text-foreground">
                  {assessment.credit_utilization === null
                    ? 'N/A'
                    : `${Math.round(assessment.credit_utilization * 100)}%`}
                </div>
              </div>
            </div>

            {assessment.reasons.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {assessment.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Assessed {new Date(assessment.created_at).toLocaleString()}</span>

              {canManage && assessment.status === 'OK' && !assessment.applied && (
                <button
                  onClick={confirmingApply ? applyRecommendation : () => setConfirmingApply(true)}
                  disabled={applying}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {applying && <Loader2 className="h-3 w-3 animate-spin" />}
                  {confirmingApply
                    ? `Confirm: set limit to KES ${assessment.recommended_credit_limit.toLocaleString()}?`
                    : 'Apply Recommended Limit'}
                </button>
              )}
              {assessment.applied && (
                <span className="text-success">Recommendation applied.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
