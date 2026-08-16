"use client";
interface SummaryMetrics {
  totalCustomers: number;
  totalDebts: number;
  totalDebtAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  overdueDebts: number;
  totalPayments: number;
  smsSent: number;
  smsFailed: number;
}
interface SummaryCardsProps {
  metrics: SummaryMetrics;
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(value);
}
const cards = [
  {
    key: "totalCustomers",
    title: "Total Customers",
    icon: "👥",
  },
  {
    key: "totalDebts",
    title: "Active Debts",
    icon: "📄",
  },
  {
    key: "totalDebtAmount",
    title: "Total Debt Value",
    icon: "💰",
    currency: true,
  },
  {
    key: "totalPaidAmount",
    title: "Amount Collected",
    icon: "✅",
    currency: true,
  },
  {
    key: "outstandingBalance",
    title: "Outstanding Balance",
    icon: "⚠️",
    currency: true,
  },
  {
    key: "overdueDebts",
    title: "Overdue Debts",
    icon: "⏰",
  },
  {
    key: "totalPayments",
    title: "Payments Received",
    icon: "💳",
  },
  {
    key: "smsSent",
    title: "SMS Sent",
    icon: "📩",
  },
  {
    key: "smsFailed",
    title: "SMS Failed",
    icon: "❌",
  },
];
export default function SummaryCards({
  metrics,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => {
        const value =
          metrics[
            card.key as keyof SummaryMetrics
          ];
        return (
          <div
            key={card.key}
            className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {card.title}
                </p>
                <h3 className="mt-2 text-2xl font-bold">
                  {card.currency
                    ? formatCurrency(Number(value))
                    : value}
                </h3>
              </div>
              <div className="text-3xl">
                {card.icon}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
