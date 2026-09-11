import { describe, test, expect } from '@jest/globals';
import { extractCreditFeatures } from '@/lib/credit/features';
import type { Debt, Payment } from '@/types/database.types';

function makeDebt(overrides: Partial<Debt>): Debt {
  return {
    id: 'debt-1',
    business_id: 'biz-1',
    customer_id: 'cust-1',
    amount: 1000,
    amount_paid: 0,
    description: 'test debt',
    payment_instructions: null,
    due_date: '2026-01-01',
    status: 'pending',
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment>): Payment {
  return {
    id: 'pay-1',
    business_id: 'biz-1',
    debt_id: 'debt-1',
    amount_paid: 500,
    payment_method: 'mpesa',
    notes: null,
    created_at: '2025-12-15T00:00:00Z',
    ...overrides,
  };
}

describe('extractCreditFeatures', () => {
  test('new customer / zero debts -> insufficient history, no crash', () => {
    const features = extractCreditFeatures([], [], 5000);
    expect(features.hasSufficientHistory).toBe(false);
    expect(features.totalDebts).toBe(0);
    expect(features.creditUtilization).toBe(0);
  });

  test('zero payments made -> repaymentRatio is 0, not NaN', () => {
    const debts = [
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 0, status: 'pending' }),
      makeDebt({ id: 'd2', amount: 2000, amount_paid: 0, status: 'pending' }),
    ];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.repaymentRatio).toBe(0);
    expect(features.totalRepaid).toBe(0);
    expect(Number.isNaN(features.repaymentRatio)).toBe(false);
  });

  test('all debts fully paid on time -> 100% on-time, sufficient history', () => {
    const debts = [
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 1000, status: 'fully_paid', due_date: '2026-06-01' }),
      makeDebt({ id: 'd2', amount: 500, amount_paid: 500, status: 'fully_paid', due_date: '2026-06-01' }),
    ];
    const payments = [
      makePayment({ debt_id: 'd1', created_at: '2026-05-01T00:00:00Z' }),
      makePayment({ debt_id: 'd2', created_at: '2026-05-01T00:00:00Z' }),
    ];
    const features = extractCreditFeatures(debts, payments, 5000);
    expect(features.hasSufficientHistory).toBe(true);
    expect(features.pctPaidOnTime).toBe(1);
    expect(features.latePaymentsCount).toBe(0);
    expect(features.paymentCompletionRate).toBe(1);
  });

  test('partial payment, still within due date', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    const debts = [
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 400, status: 'partially_paid', due_date: farFuture.toISOString().slice(0, 10) }),
      makeDebt({ id: 'd2', amount: 500, amount_paid: 500, status: 'fully_paid', due_date: '2026-01-01' }),
    ];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.partiallyPaidCount).toBe(1);
    expect(features.overdueCount).toBe(0);
    expect(features.outstandingBalance).toBe(600);
  });

  test('single overdue debt derived from balance + due date, not status column', () => {
    const debts = [
      // status still 'pending' (never touched by the payment trigger), but overdue by date.
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 0, status: 'pending', due_date: '2020-01-01' }),
      makeDebt({ id: 'd2', amount: 500, amount_paid: 500, status: 'fully_paid', due_date: '2026-01-01' }),
    ];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.overdueCount).toBe(1);
    expect(features.activeCount).toBe(1);
  });

  test('multiple overdue debts', () => {
    const debts = [
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 0, status: 'overdue', due_date: '2020-01-01' }),
      makeDebt({ id: 'd2', amount: 500, amount_paid: 0, status: 'overdue', due_date: '2020-06-01' }),
    ];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.overdueCount).toBe(2);
    expect(features.maxDaysLate).toBeGreaterThan(0);
    expect(features.avgDaysLate).toBeGreaterThan(0);
  });

  test('excellent history -> high completion rate, no overdue', () => {
    const debts = Array.from({ length: 5 }, (_, i) =>
      makeDebt({ id: `d${i}`, amount: 1000, amount_paid: 1000, status: 'fully_paid', due_date: '2026-06-01' })
    );
    const payments = debts.map((d) => makePayment({ debt_id: d.id, created_at: '2026-05-01T00:00:00Z' }));
    const features = extractCreditFeatures(debts, payments, 5000);
    expect(features.pctPaidOnTime).toBe(1);
    expect(features.overdueCount).toBe(0);
    expect(features.repaymentRatio).toBe(1);
  });

  test('poor history -> many overdue/late, low completion', () => {
    const debts = [
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 0, status: 'overdue', due_date: '2020-01-01' }),
      makeDebt({ id: 'd2', amount: 1000, amount_paid: 0, status: 'overdue', due_date: '2020-02-01' }),
      makeDebt({ id: 'd3', amount: 1000, amount_paid: 100, status: 'partially_paid', due_date: '2020-03-01' }),
    ];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.overdueCount).toBe(3);
    expect(features.paymentCompletionRate).toBe(0);
  });

  test('zero current credit limit -> utilization is null, not Infinity/NaN', () => {
    const debts = [makeDebt({ id: 'd1', amount: 1000, amount_paid: 0, status: 'pending' })];
    const features = extractCreditFeatures(debts, [], 0);
    expect(features.creditUtilization).toBeNull();
  });

  test('zero outstanding balance -> utilization is 0, not NaN', () => {
    const debts = [makeDebt({ id: 'd1', amount: 1000, amount_paid: 1000, status: 'fully_paid', due_date: '2026-01-01' })];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.outstandingBalance).toBe(0);
    expect(features.creditUtilization).toBe(0);
  });

  test('overpaid debt (abnormal data) is clamped, does not break ratios', () => {
    const debts = [
      makeDebt({ id: 'd1', amount: 1000, amount_paid: 1500, status: 'fully_paid', due_date: '2026-01-01' }),
    ];
    const features = extractCreditFeatures(debts, [], 5000);
    expect(features.totalRepaid).toBe(1000);
    expect(features.outstandingBalance).toBe(0);
    expect(features.repaymentRatio).toBeLessThanOrEqual(1);
  });
});
