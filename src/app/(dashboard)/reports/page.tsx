"use client";

import Link from "next/link";

export default function ReportsHubPage() {
  const reportCards = [
    {
      title: "Debt Reports",
      description: "Analyze outstanding balances, repayment statuses, and overdue trends.",
      href: "/dashboard/reports/debts",
      icon: "📊",
      badge: "Financial"
    },
    {
      title: "Customer Reports",
      description: "View customer debt histories, credit profiles, and performance metrics.",
      href: "/dashboard/reports/customers",
      icon: "👥",
      badge: "Clients"
    },
    {
      title: "SMS & Notification Reports",
      description: "Track alert delivery rates, carrier logs, and messaging costs.",
      href: "/dashboard/reports/sms",
      icon: "📱",
      badge: "Messaging"
    }
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500 mt-1">Access detailed audit trails, summaries, and financial reports for your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition hover:border-blue-500 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{card.icon}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {card.badge}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition">
                {card.title}
              </h2>
              <p className="text-sm text-slate-500 mt-2">{card.description}</p>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
              View Detailed Report &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
