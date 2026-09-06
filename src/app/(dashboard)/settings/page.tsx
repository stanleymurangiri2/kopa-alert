import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsHubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("business_id, businesses(business_name)")
        .eq("id", user.id)
        .single()
    : { data: null };

  const businessId = profile?.business_id ?? null;
  const business = Array.isArray(profile?.businesses)
    ? profile?.businesses[0]
    : profile?.businesses;

  const [{ count: teamCount }, { count: activeTemplateCount }] = businessId
    ? await Promise.all([
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("notification_templates")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("is_active", true),
      ])
    : [{ count: null }, { count: null }];

  const settingOptions = [
    {
      title: "Business Details",
      description: "Manage business identity, contact information, and default currency.",
      href: "/settings/business",
      icon: "🏢",
      stat: business?.business_name,
    },
    {
      title: "Notification Templates",
      description: "Customize automated upcoming, due, and overdue SMS reminder messages.",
      href: "/settings/templates",
      icon: "💬",
      stat:
        activeTemplateCount !== null
          ? `${activeTemplateCount} active`
          : undefined,
    },
    {
      title: "Team Management",
      description: "Invite employees, assign roles, and manage permissions.",
      href: "/settings/team",
      icon: "👥",
      stat: teamCount !== null ? `${teamCount} member${teamCount === 1 ? "" : "s"}` : undefined,
    },
    {
      title: "Profile & Account",
      description: "Update personal details, password, and security preferences.",
      href: "/settings/profile",
      icon: "👤",
      stat: undefined as string | undefined,
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your business account, team members, integrations, and automated alerts.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingOptions.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className="group bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition hover:border-primary flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-3xl">{opt.icon}</span>
                {opt.stat && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {opt.stat}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition">
                {opt.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">{opt.description}</p>
            </div>
            <div className="mt-6 flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
              Manage &rarr;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
