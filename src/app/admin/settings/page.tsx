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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
          Platform Settings
        </h1>

        <p className="mt-2 text-gray-500">
          Platform-wide configuration and administration.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {settings.map((setting) => (
          <section
            key={setting.title}
            className="rounded-xl bg-white p-6 shadow dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
                  {setting.title}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {setting.description}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                {setting.status}
              </span>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30">
        <h2 className="font-semibold text-blue-900 dark:text-blue-200">
          Platform settings are not configurable yet
        </h2>

        <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
          The settings displayed above are planned platform controls.
          No credentials, approval rules, or retention settings are
          changed from this page at the moment.
        </p>
      </div>
    </main>
  );
}
