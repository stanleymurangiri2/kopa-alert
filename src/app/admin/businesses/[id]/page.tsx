import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Actions from "./Actions";
import DeleteBusiness from "./DeleteBusiness";

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
      "id, business_code, business_name, email, phone, status"
    )
    .eq("id", id)
    .single();

  if (error || !business) {
    notFound();
  }

  const statusClasses =
    business.status === "approved"
      ? "bg-green-100 text-green-700"
      : business.status === "suspended"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700";

  return (
    <main className="max-w-4xl mx-auto p-8">
      <Link
        href="/admin/businesses"
        className="text-blue-600 hover:underline"
      >
        Back to Businesses
      </Link>

      <div className="mt-6 rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold mb-8">
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
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClasses}`}
            >
              {business.status}
            </span>
          </div>
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
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold">{value ?? "-"}</p>
    </div>
  );
}
