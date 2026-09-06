import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Actions from "./Actions";
import ResendActions from "./ResendActions";
import { getPlatformSetting } from "@/lib/supabase/platform-settings";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function BusinessRequestDetails({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("business_requests")
    .select(`
      id,
      business_name,
      owner_name,
      email,
      phone,
      status,
      created_at,
      resend_count
    `)
    .eq("id", id)
    .single();

  if (error || !request) {
    notFound();
  }

  const maxResends = await getPlatformSetting(supabase, "resend_limit", 3);

  const statusClasses =
    request.status === "approved"
      ? "bg-success/10 text-success"
      : request.status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-warning/10 text-warning";

  return (
    <main className="max-w-4xl mx-auto p-8">
      <Link
        href="/admin/requests"
        className="text-primary hover:underline"
      >
        Back to Requests
      </Link>

      <div className="mt-6 rounded-xl border border-border bg-card p-8 shadow">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Business Registration Review
        </h1>

        <div className="grid gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Business Name</p>
            <p className="font-semibold text-foreground">{request.business_name}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Owner Name</p>
            <p className="font-semibold text-foreground">{request.owner_name}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-foreground">{request.email}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-mono text-foreground">{request.phone}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClasses}`}
            >
              {request.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="text-foreground">
              {new Date(request.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-10">
          {request.status === "pending" ? (
            <Actions requestId={request.id} />
          ) : request.status === "approved" ? (
            <ResendActions
              requestId={request.id}
              resendCount={request.resend_count ?? 0}
              maxResends={maxResends}
            />
          ) : (
            <p className="text-muted-foreground">
              This request has already been {request.status}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
