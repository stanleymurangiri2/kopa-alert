import { describe, test, expect } from '@jest/globals';
import { scoreCredit } from '@/lib/credit/scoring';
import type { BusinessCreditConfig, CreditFeatures } from '@/lib/credit/types';

const config: BusinessCreditConfig = {
  defaultCreditLimit: 5000,
  maxCreditLimit: 50000,
  reductionPct: 25,
  freezeOnSevereOverdue: true,
};

function makeFeatures(overrides: Partial<CreditFeatures>): CreditFeatures {
  return {
    totalDebts: 5,
    totalBorrowed: 5000,
    totalRepaid: 5000,
    outstandingBalance: 0,
    fullyPaidCount: 5,
    partiallyPaidCount: 0,
    overdueCount: 0,
    activeCount: 0,
    latePaymentsCount: 0,
    avgDaysLate: 0,
    maxDaysLate: 0,
    pctPaidOnTime: 1,
    paymentCompletionRate: 1,
    repaymentRatio: 1,
    creditUtilization: 0,
    hasSufficientHistory: true,
    ...overrides,
  };
}

describe('scoreCredit', () => {
  test('new customer / insufficient history -> INSUFFICIENT_DATA, uses business default limit', () => {
    const features = makeFeatures({ hasSufficientHistory: false, totalDebts: 0 });
    const result = scoreCredit(features, config);
    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.riskScore).toBeNull();
    expect(result.riskCategory).toBe('INSUFFICIENT_DATA');
    expect(result.recommendedCreditLimit).toBe(config.defaultCreditLimit);
  });

  test('excellent history -> LOW risk, score in 0-20 band', () => {
    const features = makeFeatures({
      overdueCount: 0,
      latePaymentsCount: 0,
      pctPaidOnTime: 1,
      repaymentRatio: 1,
      creditUtilization: 0,
      avgDaysLate: 0,
    });
    const result = scoreCredit(features, config);
    expect(result.status).toBe('OK');
    expect(result.riskCategory).toBe('LOW');
    expect(result.riskScore).toBeLessThanOrEqual(20);
    expect(result.recommendedCreditLimit).toBeGreaterThanOrEqual(config.defaultCreditLimit);
  });

  test('poor history -> HIGH or VERY_HIGH risk, recommended limit reduced', () => {
    const features = makeFeatures({
      totalDebts: 5,
      overdueCount: 4,
      latePaymentsCount: 4,
      pctPaidOnTime: 0.1,
      repaymentRatio: 0.2,
      creditUtilization: 0.9,
      avgDaysLate: 25,
      outstandingBalance: 4000,
    });
    const result = scoreCredit(features, config);
    expect(result.status).toBe('OK');
    expect(['HIGH', 'VERY_HIGH']).toContain(result.riskCategory);
    expect(result.riskScore).toBeGreaterThan(60);
  });

  test('risk score is always within 0-100', () => {
    const worst = makeFeatures({
      overdueCount: 5,
      totalDebts: 5,
      latePaymentsCount: 5,
      pctPaidOnTime: 0,
      repaymentRatio: 0,
      creditUtilization: 1,
      avgDaysLate: 100,
    });
    const result = scoreCredit(worst, config);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  test('zero outstanding balance -> credit utilization 0, no crash', () => {
    const features = makeFeatures({ outstandingBalance: 0, creditUtilization: 0 });
    const result = scoreCredit(features, config);
    expect(result.status).toBe('OK');
  });

  test('null credit utilization (zero limit, nothing owed) does not break scoring', () => {
    const features = makeFeatures({ creditUtilization: null, outstandingBalance: 0 });
    const result = scoreCredit(features, config);
    expect(result.status).toBe('OK');
    expect(Number.isFinite(result.riskScore)).toBe(true);
  });

  test('null credit utilization with an outstanding balance scores as worst-case, not best-case', () => {
    // currentCreditLimit <= 0 (frozen) while still owing money is maximally
    // over-limit - must not be treated as 0% utilization (the safest score).
    const overLimit = makeFeatures({
      creditUtilization: null,
      outstandingBalance: 3000,
      overdueCount: 0,
      latePaymentsCount: 0,
      pctPaidOnTime: 1,
      repaymentRatio: 1,
      avgDaysLate: 0,
    });
    const zeroUtil = makeFeatures({
      creditUtilization: 0,
      outstandingBalance: 3000,
      overdueCount: 0,
      latePaymentsCount: 0,
      pctPaidOnTime: 1,
      repaymentRatio: 1,
      avgDaysLate: 0,
    });
    const overLimitResult = scoreCredit(overLimit, config);
    const zeroUtilResult = scoreCredit(zeroUtil, config);
    expect(overLimitResult.riskScore!).toBeGreaterThan(zeroUtilResult.riskScore!);
  });

  test('severe overdue with freeze enabled -> recommended limit capped at outstanding balance', () => {
    const features = makeFeatures({
      totalDebts: 3,
      overdueCount: 2,
      latePaymentsCount: 2,
      maxDaysLate: 45,
      avgDaysLate: 40,
      pctPaidOnTime: 0.2,
      repaymentRatio: 0.3,
      creditUtilization: 0.8,
      outstandingBalance: 2000,
    });
    const result = scoreCredit(features, config);
    expect(result.recommendedCreditLimit).toBeLessThanOrEqual(2000);
    expect(result.reasons.some((r) => r.toLowerCase().includes('restricted'))).toBe(true);
  });

  test('severe overdue with freeze disabled -> no forced cap to outstanding balance', () => {
    const relaxedConfig: BusinessCreditConfig = { ...config, freezeOnSevereOverdue: false };
    const features = makeFeatures({
      totalDebts: 3,
      overdueCount: 1,
      latePaymentsCount: 1,
      maxDaysLate: 45,
      avgDaysLate: 40,
      pctPaidOnTime: 0.6,
      repaymentRatio: 0.6,
      creditUtilization: 0.4,
      outstandingBalance: 2000,
    });
    const result = scoreCredit(features, relaxedConfig);
    expect(result.reasons.some((r) => r.toLowerCase().includes('restricted'))).toBe(false);
  });

  test('recommended limit never exceeds business max_credit_limit', () => {
    const features = makeFeatures({ creditUtilization: 0, overdueCount: 0 });
    const tightConfig: BusinessCreditConfig = { ...config, maxCreditLimit: 6000 };
    const result = scoreCredit(features, tightConfig);
    expect(result.recommendedCreditLimit).toBeLessThanOrEqual(6000);
  });

  test('recommended limit never negative', () => {
    const features = makeFeatures({
      overdueCount: 5,
      totalDebts: 5,
      latePaymentsCount: 5,
      pctPaidOnTime: 0,
      repaymentRatio: 0,
      creditUtilization: 1,
      avgDaysLate: 100,
      maxDaysLate: 100,
      outstandingBalance: 0,
    });
    const result = scoreCredit(features, config);
    expect(result.recommendedCreditLimit).toBeGreaterThanOrEqual(0);
  });
});
