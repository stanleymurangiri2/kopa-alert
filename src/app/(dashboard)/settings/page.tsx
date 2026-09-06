"use client";
import Link from "next/link";
export default function SettingsHubPage() {
  const settingOptions = [
    {
      title: "Business Details",
      description: "Manage business identity, contact information, and default currency.",
      href: "/dashboard/settings/business",
      icon: "🏢"
    },
    {
      title: "Notification Templates",
      description: "Customize automated upcoming, due, and overdue SMS reminder messages.",
      href: "/dashboard/settings/templates",
      icon: "💬"
    },
    {
      title: "Team Management",
      description: "Invite employees, assign roles, and manage permissions.",
      href: "/dashboard/settings/team",
      icon: "👥"
    },
    {
      title: "Profile & Account",
      description: "Update personal details, password, and security preferences.",
      href: "/dashboard/settings/profile",
      icon: "👤"
    }
  ];
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your business account, team members, integrations, and automated alerts.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingOptions.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className="group bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition hover:border-primary flex flex-col justify-between"
          >
            <div>
              <span className="text-3xl block mb-4">{opt.icon}</span>
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
