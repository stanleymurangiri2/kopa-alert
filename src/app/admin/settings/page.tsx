import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [{ data: superAdmins }, { data: businesses }, { count: auditLogCount }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, created_at")
        .eq("role", "super_admin")
        .order("created_at"),
      supabase.from("businesses").select("sms_balance"),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    ]);

  const gatewayConfigured = Boolean(
    process.env.AT_USERNAME && process.env.AT_API_KEY
  );
  const senderId = process.env.AT_SENDER_ID || null;
  const totalSmsCredits = (businesses ?? []).reduce(
    (sum, b) => sum + (b.sms_balance ?? 0),
    0
  );

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

        <section className="rounded-xl bg-card border border-border p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">SMS Gateway</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                All businesses send SMS through this shared Africa&apos;s Talking
                account.
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                gatewayConfigured
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {gatewayConfigured ? "Configured" : "Not configured"}
            </span>
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sender ID</span>
              <span className="font-mono text-foreground">{senderId ?? "Default"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Total SMS credits outstanding
              </span>
              <span className="font-mono font-semibold text-foreground">
                {totalSmsCredits.toLocaleString()}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Credentials are configured via environment variables. Business balances
            can be adjusted from each business&apos;s detail page.
          </p>
        </section>

        <section className="rounded-xl bg-card border border-border p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Approval Rules</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Configure default rules for business registration approval.
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Coming soon
            </span>
          </div>
        </section>

        <section className="rounded-xl bg-card border border-border p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Audit Log Retention</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Configure how long platform audit logs are retained.
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Coming soon
            </span>
          </div>

          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {(auditLogCount ?? 0).toLocaleString()}
            </span>{" "}
            entries logged so far. No automatic retention or cleanup policy is
            configured yet.
          </p>
        </section>
      </div>

      <div className="mt-8 rounded-xl border border-info/30 bg-info/10 p-6">
        <h2 className="font-semibold text-info">Most platform settings are not configurable yet</h2>

        <p className="mt-2 text-sm text-info">
          Admin Users, SMS Gateway status, and audit log count above reflect real
          platform data. Approval rules and log retention are planned controls —
          nothing is changed from this page for those yet.
        </p>
      </div>
    </main>
  );
}
