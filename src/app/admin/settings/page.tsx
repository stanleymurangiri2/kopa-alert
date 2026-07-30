export default function AdminSettingsPage() {
  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">
        Platform Settings
      </h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold">Admin Users</h2>
          <p className="text-sm text-gray-500">
            Manage super admin accounts.
          </p>
        </section>
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold">SMS Gateway</h2>
          <p className="text-sm text-gray-500">
            Configure platform-level Africa's Talking credentials.
          </p>
        </section>
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold">Approval Rules</h2>
          <p className="text-sm text-gray-500">
            Default rules for business registration approval.
          </p>
        </section>
        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-2 text-lg font-semibold">Audit Log Retention</h2>
          <p className="text-sm text-gray-500">
            Set how long audit logs are kept.
          </p>
        </section>
      </div>
    </main>
  );
}