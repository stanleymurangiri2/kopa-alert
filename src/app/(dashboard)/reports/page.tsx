import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("business_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const businessId = profile?.business_id ?? null;

  const [{ count: debtCount }, { count: customerCount }, { count: smsCount }] = businessId
    ? await Promise.all([
        supabase
          .from("debts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("notification_queue")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
      ])
    : [{ count: null }, { count: null }, { count: null }];

  const reportCards = [
    {
      title: "Debt Reports",
      description: "Analyze outstanding balances, repayment statuses, and overdue trends.",
      href: "/reports/debts",
      icon: "📊",
      stat: debtCount !== null ? `${debtCount} debt${debtCount === 1 ? "" : "s"}` : undefined,
    },
    {
      title: "Customer Reports",
      description: "View customer debt histories, credit profiles, and performance metrics.",
      href: "/reports/customers",
      icon: "👥",
      stat: customerCount !== null ? `${customerCount} customer${customerCount === 1 ? "" : "s"}` : undefined,
    },
    {
      title: "SMS & Notification Reports",
      description: "Track alert delivery rates and messaging history.",
      href: "/reports/sms",
      icon: "📱",
      stat: smsCount !== null ? `${smsCount} message${smsCount === 1 ? "" : "s"}` : undefined,
    }
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-1">Access detailed audit trails, summaries, and financial reports for your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition hover:border-primary flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">{card.icon}</span>
                {card.stat && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {card.stat}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition">
                {card.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">{card.description}</p>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
              View Detailed Report &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
