import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function UserPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!user) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto p-8">

      <div className="rounded-xl bg-white p-8 shadow">

        <h1 className="text-3xl font-bold mb-8">
          User Details
        </h1>

        <div className="space-y-5">

          <div>

            <p className="text-gray-500">
              Name
            </p>

            <p>{user.name}</p>

          </div>

          <div>

            <p className="text-gray-500">
              Email
            </p>

            <p>{user.email}</p>

          </div>

          <div>

            <p className="text-gray-500">
              Role
            </p>

            <p>{user.role}</p>

          </div>

          <div>

            <p className="text-gray-500">
              Business ID
            </p>

            <p>{user.business_id ?? "-"}</p>

          </div>

        </div>

      </div>

    </main>
  );
}