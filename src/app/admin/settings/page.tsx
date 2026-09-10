import { createClient } from "@/lib/supabase/server";
import { getPlatformSetting } from "@/lib/supabase/platform-settings";
import ApprovalRulesControl from "./ApprovalRulesControl";
import AuditRetentionControl from "./AuditRetentionControl";
import SmsTemplatesControl, { type PlatformTemplate } from "./SmsTemplatesControl";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [
    { data: superAdmins },
    { data: businesses },
    { count: auditLogCount },
    { data: platformTemplates },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, created_at")
      .eq("role", "super_admin")
      .order("created_at"),
    supabase.from("businesses").select("sms_balance"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("platform_notification_templates")
      .select("type, channel, message_template, days_offset, is_active")
      .order("days_offset"),
  ]);

  const resendLimit = await getPlatformSetting(supabase, "resend_limit", 3);
  const autoExpireDays = await getPlatformSetting<number | null>(
    supabase,
    "pending_request_auto_expire_days",
    null
  );
  const auditRetentionDays = await getPlatformSetting<number | null>(
    supabase,
    "audit_log_retention_days",
    null
  );

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
          <div>
            <h2 className="text-lg font-semibold text-foreground">Approval Rules</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Rules governing business registration approval.
            </p>
          </div>

          <ApprovalRulesControl resendLimit={resendLimit} autoExpireDays={autoExpireDays} />
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
              {(auditLogCount ?? 0).toLocaleString()} entries
            </span>
          </div>

          <AuditRetentionControl retentionDays={auditRetentionDays} />
        </section>
      </div>

      <section className="mt-6 rounded-xl bg-card border border-border p-6 shadow">
        <div>
          <h2 className="text-lg font-semibold text-foreground">SMS Reminder Templates</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            The wording every business's automated debt reminders use. Businesses can view
            their active templates but can no longer edit them here - changes made below
            apply to every business immediately.
          </p>
        </div>

        <SmsTemplatesControl templates={(platformTemplates ?? []) as PlatformTemplate[]} />
      </section>

      <div className="mt-8 rounded-xl border border-info/30 bg-info/10 p-6">
        <h2 className="font-semibold text-info">Some platform settings are still not configurable</h2>

        <p className="mt-2 text-sm text-info">
          Admin Users and SMS Gateway status above are read-only: creating/removing
          super admins isn't built yet, and SMS gateway credentials intentionally stay
          in environment variables rather than an editable form, since exposing API
          keys in a web UI would be a security downgrade, not an improvement.
        </p>
      </div>
    </main>
  );
}
