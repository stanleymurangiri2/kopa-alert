import SummaryCards from "@/components/reports/SummaryCards";

interface OverviewResponse {
  success: boolean;
  data?: {
    totalCustomers: number;
    totalDebts: number;
    totalDebtAmount: number;
    totalPaidAmount: number;
    outstandingBalance: number;
    overdueDebts: number;
    totalPayments: number;
    smsSent: number;
    smsFailed: number;
  };
  message?: string;
}

async function getOverview(): Promise<OverviewResponse> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { headers } = await import("next/headers");

    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const response = await fetch(`${baseUrl}/api/reports/overview`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to load dashboard data.",
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Dashboard fetch error:", error);

    return {
      success: false,
      message: "Unable to connect to dashboard service.",
    };
  }
}

export default async function DashboardPage() {

  const overview = await getOverview();


  if (!overview.success || !overview.data) {
    return (
      <div className="p-6">

        <div className="rounded-lg border border-border bg-card p-6">

          <h1 className="text-2xl font-bold text-foreground">
            Dashboard
          </h1>

          <p className="mt-3 text-muted-foreground">
            {overview.message ??
              "Unable to load dashboard metrics."}
          </p>

        </div>

      </div>
    );
  }


  return (
    <div className="space-y-8 p-6">

      {/* Header */}

      <div>

        <h1 className="text-3xl font-bold text-foreground">
          Business Dashboard
        </h1>

        <p className="mt-2 text-muted-foreground">
          Monitor customers, debts, payments, and SMS activity.
        </p>

      </div>


      {/* KPI Cards */}

      <SummaryCards
        metrics={overview.data}
      />


      {/* Quick Overview */}

      <div className="grid gap-6 md:grid-cols-2">

        <div className="rounded-xl border border-border bg-card p-6">

          <h2 className="text-xl font-semibold text-foreground">
            Collection Overview
          </h2>


          <div className="mt-5 space-y-3">

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Total Debt
              </span>

              <span className="font-semibold text-foreground">
                KES{" "}
                {overview.data.totalDebtAmount.toLocaleString(
                  "en-US"
                )}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Collected
              </span>

              <span className="font-semibold text-success">
                KES{" "}
                {overview.data.totalPaidAmount.toLocaleString(
                  "en-US"
                )}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Remaining
              </span>

              <span className="font-semibold text-warning">
                KES{" "}
                {overview.data.outstandingBalance.toLocaleString(
                  "en-US"
                )}
              </span>
            </div>

          </div>

        </div>


        <div className="rounded-xl border border-border bg-card p-6">

          <h2 className="text-xl font-semibold text-foreground">
            SMS Performance
          </h2>


          <div className="mt-5 space-y-3">

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Messages Sent
              </span>

              <span className="font-semibold text-success">
                {overview.data.smsSent}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Failed Messages
              </span>

              <span className="font-semibold text-destructive">
                {overview.data.smsFailed}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Delivery Rate
              </span>

              <span className="font-semibold text-foreground">
                {overview.data.smsSent +
                  overview.data.smsFailed ===
                0
                  ? 0
                  :
                  Math.round(
                    (overview.data.smsSent /
                      (overview.data.smsSent +
                        overview.data.smsFailed)) *
                      100
                  )
                }%
              </span>
            </div>

          </div>

        </div>

      </div>


      {/* Future Charts Section */}

      <div className="rounded-xl border border-border bg-card p-6">

        <h2 className="text-xl font-semibold text-foreground">
          Analytics & Reports
        </h2>

        <p className="mt-2 text-muted-foreground">
          Debt trends, payment charts, customer growth,
          and notification analytics will appear here.
        </p>

      </div>


    </div>
  );
}