import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Actions from "./Actions";
import DeleteBusiness from "./DeleteBusiness";
import SmsBalanceControl from "./SmsBalanceControl";

interface BusinessPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function BusinessPage({
  params,
}: BusinessPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: business, error } = await supabase
    .from("businesses")
    .select(
      "id, business_code, business_name, email, phone, status, subscription_tier, subscription_status, sms_balance, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !business) {
    notFound();
  }

  const statusClasses =
    business.status === "approved"
      ? "bg-success/10 text-success"
      : business.status === "suspended"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  return (
    <main className="max-w-4xl mx-auto p-8">
      <Link
        href="/admin/businesses"
        className="text-primary hover:underline"
      >
        Back to Businesses
      </Link>

      <div className="mt-6 rounded-xl bg-card border border-border p-8 shadow">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          {business.business_name}
        </h1>

        <div className="grid gap-6">
          <Info
            label="Business Code"
            value={business.business_code}
          />

          <Info
            label="Email"
            value={business.email}
          />

          <Info
            label="Phone"
            value={business.phone}
          />

          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClasses}`}
            >
              {business.status}
            </span>
          </div>

          <Info
            label="Subscription Tier"
            value={business.subscription_tier}
          />

          <Info
            label="Subscription Status"
            value={business.subscription_status}
          />

          <div>
            <p className="text-sm text-muted-foreground">SMS Balance</p>
            <p className="font-semibold text-foreground">
              {business.sms_balance !== null ? business.sms_balance.toLocaleString() : "-"}
            </p>
            <SmsBalanceControl businessId={business.id} balance={business.sms_balance ?? 0} />
          </div>

          <Info
            label="Registered On"
            value={
              business.created_at
                ? new Date(business.created_at).toLocaleString()
                : null
            }
          />
        </div>

        <div className="mt-10">
          <Actions
            id={business.id}
            status={business.status}
          />
        </div>

        <DeleteBusiness
          businessId={business.id}
          businessName={business.business_name}
        />
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value ?? "-"}</p>
    </div>
  );
}
