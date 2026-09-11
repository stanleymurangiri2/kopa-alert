import type { Debt, Payment } from "@/types/database.types";
import type { CreditFeatures } from "./types";

/**
 * Below this many debts, there isn't enough of a repayment pattern to judge -
 * one resolved debt could be a fluke either way. Tunable in one place.
 */
export const MIN_DEBTS_FOR_ASSESSMENT = 2;

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Pure feature extraction from one customer's debts/payments. No I/O.
 * Mirrors how calculate_customer_ratings() derives "overdue" - from the
 * unpaid balance and due date, not the (trigger-updated, can go stale)
 * debts.status column - so a never-paid overdue debt is still counted.
 */
export function extractCreditFeatures(
  debts: Debt[],
  payments: Payment[],
  currentCreditLimit: number
): CreditFeatures {
  const today = new Date();
  const totalDebts = debts.length;

  if (totalDebts === 0) {
    return {
      totalDebts: 0,
      totalBorrowed: 0,
      totalRepaid: 0,
      outstandingBalance: 0,
      fullyPaidCount: 0,
      partiallyPaidCount: 0,
      overdueCount: 0,
      activeCount: 0,
      latePaymentsCount: 0,
      avgDaysLate: 0,
      maxDaysLate: 0,
      pctPaidOnTime: 0,
      paymentCompletionRate: 0,
      repaymentRatio: 0,
      creditUtilization: currentCreditLimit > 0 ? 0 : null,
      hasSufficientHistory: false,
    };
  }

  const paymentsByDebt = new Map<string, Payment[]>();
  for (const payment of payments) {
    const list = paymentsByDebt.get(payment.debt_id) ?? [];
    list.push(payment);
    paymentsByDebt.set(payment.debt_id, list);
  }

  let totalBorrowed = 0;
  let totalRepaid = 0;
  let outstandingBalance = 0;
  let fullyPaidCount = 0;
  let partiallyPaidCount = 0;
  let overdueCount = 0;
  let activeCount = 0;
  let onTimeCount = 0;
  let latePaymentsCount = 0;
  const daysLateSamples: number[] = [];

  for (const debt of debts) {
    const amount = Number(debt.amount) || 0;
    // Clamp: a debt's recorded amount_paid should never exceed its amount
    // (overpayment goes to available_credit instead), but guard against
    // abnormal/legacy data rather than let it skew ratios.
    const amountPaid = Math.min(Number(debt.amount_paid) || 0, amount);
    const balance = Math.max(amount - amountPaid, 0);
    const dueDate = new Date(debt.due_date);

    totalBorrowed += amount;
    totalRepaid += amountPaid;
    outstandingBalance += balance;

    const isFullyPaid = debt.status === "fully_paid";
    const isPartiallyPaid = debt.status === "partially_paid";
    const isOverdue = balance > 0 && dueDate < today;

    if (isFullyPaid) fullyPaidCount++;
    if (isPartiallyPaid) partiallyPaidCount++;
    if (isOverdue) overdueCount++;
    if (balance > 0) activeCount++;

    if (isFullyPaid) {
      const debtPayments = paymentsByDebt.get(debt.id) ?? [];
      const lastPaymentDate = debtPayments.reduce<Date | null>((latest, p) => {
        const d = new Date(p.created_at);
        return !latest || d > latest ? d : latest;
      }, null);

      if (lastPaymentDate && lastPaymentDate > dueDate) {
        latePaymentsCount++;
        daysLateSamples.push(daysBetween(lastPaymentDate, dueDate));
      } else {
        onTimeCount++;
      }
    } else if (isOverdue) {
      // Still unresolved and overdue - counts toward lateness too, using
      // "days late so far" rather than waiting for eventual payment.
      latePaymentsCount++;
      daysLateSamples.push(daysBetween(today, dueDate));
    }
  }

  const avgDaysLate =
    daysLateSamples.length === 0
      ? 0
      : daysLateSamples.reduce((sum, d) => sum + d, 0) / daysLateSamples.length;
  const maxDaysLate = daysLateSamples.length === 0 ? 0 : Math.max(...daysLateSamples);

  const pctPaidOnTime = fullyPaidCount === 0 ? 0 : onTimeCount / fullyPaidCount;
  const paymentCompletionRate = totalDebts === 0 ? 0 : fullyPaidCount / totalDebts;
  const repaymentRatio = totalBorrowed === 0 ? 0 : totalRepaid / totalBorrowed;
  const creditUtilization = currentCreditLimit > 0 ? outstandingBalance / currentCreditLimit : null;

  return {
    totalDebts,
    totalBorrowed,
    totalRepaid,
    outstandingBalance,
    fullyPaidCount,
    partiallyPaidCount,
    overdueCount,
    activeCount,
    latePaymentsCount,
    avgDaysLate,
    maxDaysLate,
    pctPaidOnTime,
    paymentCompletionRate,
    repaymentRatio,
    creditUtilization,
    hasSufficientHistory: totalDebts >= MIN_DEBTS_FOR_ASSESSMENT,
  };
}
