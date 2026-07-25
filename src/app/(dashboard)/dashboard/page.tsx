import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("*, businesses(*)")
    .eq("id", user?.id)
    .single();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.name}
        </h1>
        <p className="text-gray-600 mt-1">
          Role: <span className="font-semibold uppercase">{profile?.role}</span>
        </p>
        {profile?.businesses && (
          <p className="text-gray-600">
            Business Status:{" "}
            <span className="font-semibold capitalize text-green-600">
              {profile.businesses.status}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
