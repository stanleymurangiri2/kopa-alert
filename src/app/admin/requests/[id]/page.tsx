import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Actions from "./Actions";
import ResendActions from "./ResendActions";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

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

  return (
    <main className="max-w-4xl mx-auto p-8">
      <Link
        href="/admin/requests"
        className="text-blue-600 hover:underline"
      >
        Back to Requests
      </Link>

      <div className="mt-6 rounded-xl border bg-white p-8 shadow">
        <h1 className="text-3xl font-bold mb-8">
          Business Registration Review
        </h1>

        <div className="grid gap-6">
          <div>
            <p className="text-sm text-gray-500">Business Name</p>
            <p className="font-semibold">{request.business_name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Owner Name</p>
            <p className="font-semibold">{request.owner_name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p>{request.email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p>{request.phone}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
              {request.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Submitted</p>
            <p>
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
            />
          ) : (
            <p className="text-gray-500">
              This request has already been {request.status}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
