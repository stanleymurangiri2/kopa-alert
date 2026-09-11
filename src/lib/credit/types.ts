export type RiskCategory =
  | "LOW"
  | "MODERATE_LOW"
  | "MODERATE"
  | "HIGH"
  | "VERY_HIGH"
  | "INSUFFICIENT_DATA";

export type AssessmentStatus = "OK" | "INSUFFICIENT_DATA" | "FAILED";

export interface CreditFeatures {
  totalDebts: number;
  totalBorrowed: number;
  totalRepaid: number;
  outstandingBalance: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  overdueCount: number;
  activeCount: number;
  latePaymentsCount: number;
  avgDaysLate: number;
  maxDaysLate: number;
  pctPaidOnTime: number;
  paymentCompletionRate: number;
  repaymentRatio: number;
  creditUtilization: number | null;
  hasSufficientHistory: boolean;
}

export interface BusinessCreditConfig {
  defaultCreditLimit: number;
  maxCreditLimit: number;
  reductionPct: number;
  freezeOnSevereOverdue: boolean;
}

export interface CreditScoringResult {
  status: AssessmentStatus;
  riskScore: number | null;
  riskCategory: RiskCategory;
  recommendedCreditLimit: number;
  reasons: string[];
}

export interface CreditAssessment {
  id: string;
  business_id: string;
  customer_id: string;
  status: AssessmentStatus;
  risk_score: number | null;
  risk_category: RiskCategory;
  current_credit_limit: number;
  recommended_credit_limit: number;
  outstanding_balance: number;
  credit_utilization: number | null;
  reasons: string[];
  features: CreditFeatures | Record<string, never>;
  model_version: string;
  error_message: string | null;
  applied: boolean;
  applied_at: string | null;
  applied_by: string | null;
  created_by: string | null;
  created_at: string;
}
