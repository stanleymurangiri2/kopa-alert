export const dynamic = "force-dynamic";

const settings = [
  {
    title: "Admin Users",
    description: "Manage Super Administrator accounts.",
    status: "Coming soon",
  },
  {
    title: "SMS Gateway",
    description:
      "Configure platform-level Africa's Talking credentials.",
    status: "Coming soon",
  },
  {
    title: "Approval Rules",
    description:
      "Configure default rules for business registration approval.",
    status: "Coming soon",
  },
  {
    title: "Audit Log Retention",
    description:
      "Configure how long platform audit logs are retained.",
    status: "Coming soon",
  },
];

export default function AdminSettingsPage() {
  return (
    <main className="p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Platform Settings
        </h1>

        <p className="mt-2 text-muted-foreground">
          Platform-wide configuration and administration.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {settings.map((setting) => (
          <section
            key={setting.title}
            className="rounded-xl bg-card border border-border p-6 shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {setting.title}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {setting.description}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {setting.status}
              </span>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-info/30 bg-info/10 p-6">
        <h2 className="font-semibold text-info">
          Platform settings are not configurable yet
        </h2>

        <p className="mt-2 text-sm text-info">
          The settings displayed above are planned platform controls.
          No credentials, approval rules, or retention settings are
          changed from this page at the moment.
        </p>
      </div>
    </main>
  );
}
