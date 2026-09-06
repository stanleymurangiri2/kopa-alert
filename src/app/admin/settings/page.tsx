import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const unimplementedSettings = [
  {
    title: "SMS Gateway",
    description: "Configure platform-level Africa's Talking credentials.",
  },
  {
    title: "Approval Rules",
    description: "Configure default rules for business registration approval.",
  },
  {
    title: "Audit Log Retention",
    description: "Configure how long platform audit logs are retained.",
  },
];

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: superAdmins } = await supabase
    .from("users")
    .select("id, name, email, created_at")
    .eq("role", "super_admin")
    .order("created_at");

  return (
    <main className="p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>

        <p className="mt-2 text-muted-foreground">
          Platform-wide configuration and administration.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl bg-card border border-border p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Admin Users</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Super Administrator accounts with full platform access.
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-employee/10 px-3 py-1 text-xs font-medium text-employee">
              {superAdmins?.length ?? 0}
            </span>
          </div>

          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            {(superAdmins ?? []).map((admin) => (
              <li key={admin.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{admin.name || "-"}</p>
                  <p className="text-muted-foreground">{admin.email}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {admin.created_at
                    ? new Date(admin.created_at).toLocaleDateString()
                    : "-"}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-muted-foreground">
            Read-only for now — creating or removing Super Administrator accounts
            isn't available from this page yet.
          </p>
        </section>

        {unimplementedSettings.map((setting) => (
          <section
            key={setting.title}
            className="rounded-xl bg-card border border-border p-6 shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{setting.title}</h2>

                <p className="mt-2 text-sm text-muted-foreground">{setting.description}</p>
              </div>

              <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Coming soon
              </span>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-info/30 bg-info/10 p-6">
        <h2 className="font-semibold text-info">Most platform settings are not configurable yet</h2>

        <p className="mt-2 text-sm text-info">
          Admin Users above reflects real accounts. SMS Gateway credentials,
          approval rules, and log retention are planned controls — nothing is
          changed from this page for those yet.
        </p>
      </div>
    </main>
  );
}
