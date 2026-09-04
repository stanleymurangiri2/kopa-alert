import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Actions from "./Actions";
import DeleteBusiness from "./DeleteBusiness";

interface BusinessPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BusinessPage({
  params,
}: BusinessPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();
  if (!business) {
    notFound();
  }
  return (
    <main className="max-w-4xl mx-auto p-8">
      <div className="rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold mb-8">
          {business.business_name}
        </h1>
        <div className="grid gap-6">
          <Info label="Business Code" value={business.business_code} />
          <Info label="Email" value={business.email} />
          <Info label="Phone" value={business.phone} />
          <Info label="Status" value={business.status} />
        </div>
        <div className="mt-10">
          <Actions id={business.id} status={business.status} />
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