import type { BusinessCreditConfig, CreditFeatures, CreditScoringResult, RiskCategory } from "./types";

/** maxDaysLate beyond this is treated as "severe" overdue. */
const SEVERE_OVERDUE_DAYS = 30;
/** avgDaysLate at/above this is treated as maximally bad for scoring purposes. */
const DAYS_LATE_SCORING_CAP = 30;

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function categoryFromScore(score: number): RiskCategory {
  if (score <= 20) return "LOW";
  if (score <= 40) return "MODERATE_LOW";
  if (score <= 60) return "MODERATE";
  if (score <= 80) return "HIGH";
  return "VERY_HIGH";
}

/**
 * Pure, deterministic rule-based scorer standing in for a trained ML model.
 * Same signature/shape a future Phase 2 model call would use - this is the
 * only function a real model replaces; everything else in the engine is
 * unaffected by that swap.
 */
export function scoreCredit(
  features: CreditFeatures,
  config: BusinessCreditConfig
): CreditScoringResult {
  if (!features.hasSufficientHistory) {
    return {
      status: "INSUFFICIENT_DATA",
      riskScore: null,
      riskCategory: "INSUFFICIENT_DATA",
      recommendedCreditLimit: config.defaultCreditLimit,
      reasons: ["Not enough repayment history to assess risk yet."],
    };
  }

  const overdueRatio = clamp01(features.overdueCount / features.totalDebts);
  const lateRatio = clamp01(features.latePaymentsCount / features.totalDebts);
  const lateOnTimeFactor = clamp01(1 - features.pctPaidOnTime);
  const unpaidFactor = clamp01(1 - features.repaymentRatio);
  // creditUtilization is null exactly when currentCreditLimit <= 0 (a
  // frozen/zero limit) - coalescing that to 0 would score it as the best
  // possible utilization, when a customer with any outstanding balance
  // against a zero limit is maximally over-limit, the worst case. Only
  // genuinely neutral (0) when there's nothing owed either.
  const utilizationFactor = clamp01(
    features.creditUtilization ?? (features.outstandingBalance > 0 ? 1 : 0)
  );
  const daysLateFactor = clamp01(features.avgDaysLate / DAYS_LATE_SCORING_CAP);

  const weightedRisk =
    overdueRatio * 0.3 +
    lateRatio * 0.2 +
    lateOnTimeFactor * 0.2 +
    unpaidFactor * 0.15 +
    utilizationFactor * 0.1 +
    daysLateFactor * 0.05;

  const riskScore = Math.round(clamp01(weightedRisk) * 100);
  const riskCategory = categoryFromScore(riskScore);

  const reasons: string[] = [];
  if (features.overdueCount > 0) {
    reasons.push(
      `Customer has ${features.overdueCount} overdue debt${features.overdueCount === 1 ? "" : "s"}.`
    );
  }
  if (features.avgDaysLate > 0) {
    reasons.push(`Average repayment delay is ${Math.round(features.avgDaysLate)} days.`);
  }
  if (features.fullyPaidCount > 0) {
    reasons.push(`${Math.round(features.pctPaidOnTime * 100)}% of previous debts were paid on time.`);
  }
  reasons.push(`Current outstanding balance is KES ${Math.round(features.outstandingBalance).toLocaleString()}.`);
  if (features.creditUtilization !== null) {
    reasons.push(`Credit utilization is ${Math.round(features.creditUtilization * 100)}%.`);
  }

  const isSevereOverdue = config.freezeOnSevereOverdue && features.maxDaysLate >= SEVERE_OVERDUE_DAYS;

  let recommendedCreditLimit: number;
  switch (riskCategory) {
    case "LOW":
      // Maintain or increase, up to the business's configured ceiling.
      recommendedCreditLimit = Math.min(
        Math.max(config.defaultCreditLimit, features.outstandingBalance) * 1.2,
        config.maxCreditLimit
      );
      break;
    case "MODERATE_LOW":
      recommendedCreditLimit = Math.max(config.defaultCreditLimit, features.outstandingBalance);
      break;
    case "MODERATE":
      recommendedCreditLimit =
        Math.max(config.defaultCreditLimit, features.outstandingBalance) * (1 - config.reductionPct / 200);
      break;
    case "HIGH":
      recommendedCreditLimit =
        Math.max(config.defaultCreditLimit, features.outstandingBalance) * (1 - config.reductionPct / 100);
      break;
    case "VERY_HIGH":
    default:
      recommendedCreditLimit =
        Math.max(config.defaultCreditLimit, features.outstandingBalance) *
        (1 - Math.min(config.reductionPct * 2, 90) / 100);
      break;
  }

  if (isSevereOverdue) {
    // No new borrowing room until the existing overdue balance is resolved.
    recommendedCreditLimit = Math.min(recommendedCreditLimit, features.outstandingBalance);
    reasons.push("Credit temporarily restricted due to a severely overdue balance.");
  }

  recommendedCreditLimit = Math.min(
    config.maxCreditLimit,
    Math.max(0, Math.round(recommendedCreditLimit))
  );

  return {
    status: "OK",
    riskScore,
    riskCategory,
    recommendedCreditLimit,
    reasons,
  };
}
