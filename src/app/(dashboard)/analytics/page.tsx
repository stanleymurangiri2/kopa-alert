import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Debt = {
  amount: number;
  amount_paid: number;
  due_date: string;
  status: string;
};

type Payment = {
  amount_paid: number;
  payment_method: string;
  created_at: string;
};

type NotificationRow = {
  status: string;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysUntilDue(dueDate: string) {
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

const DEBT_STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-success',
  Overdue: 'bg-destructive',
  'Due today': 'bg-destructive',
  Upcoming: 'bg-info',
};

const PAYMENT_METHOD_STYLES: Record<string, string> = {
  mpesa: 'bg-success',
  cash: 'bg-primary',
  bank: 'bg-info',
};

const NOTIFICATION_STATUS_STYLES: Record<string, string> = {
  sent: 'bg-success',
  pending: 'bg-warning',
  failed: 'bg-destructive',
  cancelled: 'bg-muted-foreground',
};

function ReportCard({ title, value, tone }: { title: string; value: string | number; tone?: string }) {
  const toneClasses: Record<string, string> = {
    warning: 'text-warning',
    success: 'text-success',
    destructive: 'text-destructive',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      <p className={`mt-3 font-mono text-3xl font-bold ${tone ? toneClasses[tone] : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  total,
  counts,
  styles,
}: {
  title: string;
  total: number;
  counts: Record<string, number>;
  styles: Record<string, string>;
}) {
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-foreground">{title}</h3>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-foreground">{label.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${styles[label] ?? 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6 text-muted-foreground">Please sign in to view analytics.</div>
    );
  }

  const { data: profile } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  const businessId = profile?.business_id;

  if (!businessId) {
    return (
      <div className="p-6 text-muted-foreground">No business associated with this account.</div>
    );
  }

  const [customersResult, debtsResult, paymentsResult, notificationsResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),

    supabase
      .from('debts')
      .select('amount, amount_paid, due_date, status')
      .eq('business_id', businessId),

    supabase
      .from('payments')
      .select('amount_paid, payment_method, created_at')
      .eq('business_id', businessId),

    supabase
      .from('notification_queue')
      .select('status')
      .eq('business_id', businessId),
  ]);

  const debts = (debtsResult.data ?? []) as Debt[];
  const payments = (paymentsResult.data ?? []) as Payment[];
  const notifications = (notificationsResult.data ?? []) as NotificationRow[];

  let outstanding = 0;
  let collected = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  const debtsByStatus: Record<string, number> = {};

  for (const debt of debts) {
    const balance = Number(debt.amount) - Number(debt.amount_paid);
    collected += Number(debt.amount_paid ?? 0);

    if (balance <= 0) {
      debtsByStatus.Paid = (debtsByStatus.Paid ?? 0) + 1;
      continue;
    }

    outstanding += balance;

    const diff = daysUntilDue(debt.due_date);

    if (diff < 0) {
      overdueCount += 1;
      overdueAmount += balance;
      debtsByStatus.Overdue = (debtsByStatus.Overdue ?? 0) + 1;
    } else if (diff === 0) {
      debtsByStatus['Due today'] = (debtsByStatus['Due today'] ?? 0) + 1;
    } else {
      debtsByStatus.Upcoming = (debtsByStatus.Upcoming ?? 0) + 1;
    }
  }

  const paymentsByMethod: Record<string, number> = {};
  for (const payment of payments) {
    const method = payment.payment_method ?? 'unknown';
    paymentsByMethod[method] = (paymentsByMethod[method] ?? 0) + 1;
  }

  const notificationsByStatus: Record<string, number> = {};
  for (const notification of notifications) {
    const status = notification.status ?? 'unknown';
    notificationsByStatus[status] = (notificationsByStatus[status] ?? 0) + 1;
  }

  const today = startOfDay(new Date());
  const dailyCollections = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyCollections.set(dateKey(d), 0);
  }

  for (const payment of payments) {
    const key = dateKey(startOfDay(new Date(payment.created_at)));
    if (dailyCollections.has(key)) {
      dailyCollections.set(key, (dailyCollections.get(key) ?? 0) + Number(payment.amount_paid ?? 0));
    }
  }

  const trend = [...dailyCollections.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  const last30DaysCollected = trend.reduce((sum, [, amount]) => sum + amount, 0);

  const cards = [
    { title: 'Customers', value: customersResult.count ?? 0 },
    { title: 'Debts', value: debts.length },
    { title: 'Outstanding Balance', value: `KES ${outstanding.toLocaleString()}` },
    { title: 'Collected', value: `KES ${collected.toLocaleString()}`, tone: 'success' },
    { title: 'Overdue Debts', value: overdueCount, tone: 'destructive' },
    { title: 'Overdue Amount', value: `KES ${overdueAmount.toLocaleString()}`, tone: 'destructive' },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Business performance overview</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <ReportCard key={card.title} title={card.title} value={card.value} tone={card.tone} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownCard
          title="Debts by Status"
          total={debts.length}
          counts={debtsByStatus}
          styles={DEBT_STATUS_STYLES}
        />

        <BreakdownCard
          title="Payments by Method"
          total={payments.length}
          counts={paymentsByMethod}
          styles={PAYMENT_METHOD_STYLES}
        />

        <BreakdownCard
          title="Notifications by Status"
          total={notifications.length}
          counts={notificationsByStatus}
          styles={NOTIFICATION_STATUS_STYLES}
        />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-foreground">
          Collections Trend (Last 30 Days)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          KES {last30DaysCollected.toLocaleString()} collected in this window.
        </p>

        <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full">
            <thead className="sticky top-0 bg-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody>
              {trend.map(([day, amount], i) => (
                <tr
                  key={day}
                  className={`border-t border-border ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                >
                  <td className="px-6 py-2 text-sm text-muted-foreground">
                    {parseDateKey(day).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-2 text-right font-mono text-sm text-foreground">
                    KES {amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
