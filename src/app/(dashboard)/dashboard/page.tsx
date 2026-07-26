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
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/reports/overview`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to load dashboard data.",
      };
    }

    return await response.json();

  } catch (error) {
    console.error(
      "Dashboard fetch error:",
      error
    );

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

        <div className="rounded-lg border bg-white p-6">

          <h1 className="text-2xl font-bold">
            Dashboard
          </h1>

          <p className="mt-3 text-gray-500">
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

        <h1 className="text-3xl font-bold">
          Business Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Monitor customers, debts, payments, and SMS activity.
        </p>

      </div>


      {/* KPI Cards */}

      <SummaryCards
        metrics={overview.data}
      />


      {/* Quick Overview */}

      <div className="grid gap-6 md:grid-cols-2">

        <div className="rounded-xl border bg-white p-6">

          <h2 className="text-xl font-semibold">
            Collection Overview
          </h2>


          <div className="mt-5 space-y-3">

            <div className="flex justify-between">
              <span className="text-gray-500">
                Total Debt
              </span>

              <span className="font-semibold">
                KES{" "}
                {overview.data.totalDebtAmount.toLocaleString(
                  "en-US"
                )}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-gray-500">
                Collected
              </span>

              <span className="font-semibold">
                KES{" "}
                {overview.data.totalPaidAmount.toLocaleString(
                  "en-US"
                )}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-gray-500">
                Remaining
              </span>

              <span className="font-semibold">
                KES{" "}
                {overview.data.outstandingBalance.toLocaleString(
                  "en-US"
                )}
              </span>
            </div>

          </div>

        </div>


        <div className="rounded-xl border bg-white p-6">

          <h2 className="text-xl font-semibold">
            SMS Performance
          </h2>


          <div className="mt-5 space-y-3">

            <div className="flex justify-between">
              <span className="text-gray-500">
                Messages Sent
              </span>

              <span className="font-semibold">
                {overview.data.smsSent}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-gray-500">
                Failed Messages
              </span>

              <span className="font-semibold">
                {overview.data.smsFailed}
              </span>
            </div>


            <div className="flex justify-between">
              <span className="text-gray-500">
                Delivery Rate
              </span>

              <span className="font-semibold">
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

      <div className="rounded-xl border bg-white p-6">

        <h2 className="text-xl font-semibold">
          Analytics & Reports
        </h2>

        <p className="mt-2 text-gray-500">
          Debt trends, payment charts, customer growth,
          and notification analytics will appear here.
        </p>

      </div>


    </div>
  );
}