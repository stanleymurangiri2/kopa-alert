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
          className="text-sm text-primary hover:underline"
        >
          ← Back to Users
        </Link>
      </div>

      <div className="rounded-xl bg-card border border-border p-8 shadow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Details</h1>
            <p className="text-muted-foreground mt-1">
              Administrator view of this user account.
            </p>
          </div>

          <span className="rounded-full bg-info/10 px-3 py-1 text-sm font-medium text-info">
            {user.role}
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p className="mt-1 text-lg text-foreground">{user.name || "-"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="mt-1 text-lg text-foreground">{user.email || "-"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Role</p>
            <p className="mt-1 capitalize text-foreground">{user.role || "-"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Business ID</p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">
              {user.business_id ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">User ID</p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">{user.id}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Created At</p>
            <p className="mt-1 text-foreground">
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
