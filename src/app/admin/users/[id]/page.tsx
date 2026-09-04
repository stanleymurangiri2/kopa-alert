import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id,name,email,role,business_id,created_at")
    .eq("id", id)
    .single();

  if (error || !user) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-sm text-blue-600 hover:underline"
        >
          ? Back to Users
        </Link>
      </div>

      <div className="rounded-xl bg-white p-8 shadow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-gray-500 mt-1">
              Administrator view of this user account.
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {user.role}
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p className="mt-1 text-lg">{user.name || "-"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="mt-1 text-lg">{user.email || "-"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Role</p>
            <p className="mt-1 capitalize">{user.role || "-"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Business ID</p>
            <p className="mt-1 break-all font-mono text-sm">
              {user.business_id ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">User ID</p>
            <p className="mt-1 break-all font-mono text-sm">{user.id}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-500">Created At</p>
            <p className="mt-1">
              {user.created_at
                ? new Date(user.created_at).toLocaleString()
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
