import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const supabase = await createClient();

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      id,
      business_code,
      business_name,
      phone,
      email,
      status
    `)
    .order("business_name");

  if (error) {
    throw new Error(`Failed to load businesses: ${error.message}`);
  }

  return (
    <main className="p-8">

      <h1 className="mb-8 text-3xl font-bold text-foreground">
        Business Management
      </h1>

      <div className="overflow-x-auto rounded-xl bg-card border border-border shadow">

        <table className="w-full">

          <thead className="bg-primary">
            <tr>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Code
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Business
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Phone
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Email
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Status
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-primary-foreground">
                Action
              </th>

            </tr>
          </thead>

          <tbody>

            {businesses && businesses.length > 0 ? (
              businesses.map((business, i) => (

                <tr
                  key={business.id}
                  className={`border-t border-border hover:bg-accent ${i % 2 === 1 ? 'bg-table-stripe' : 'bg-card'}`}
                >

                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {business.business_code}
                  </td>

                  <td className="px-6 py-4 text-[15px] font-semibold text-foreground">
                    {business.business_name}
                  </td>

                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {business.phone}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {business.email}
                  </td>

                  <td className="px-6 py-4">

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        business.status === "active"
                          ? "bg-success/10 text-success"
                          : business.status === "suspended"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {business.status}
                    </span>

                  </td>

                  <td className="px-6 py-4">

                    <Link
                      href={`/admin/businesses/${business.id}`}
                      className="text-primary hover:underline"
                    >
                      View
                    </Link>

                  </td>

                </tr>

              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-muted-foreground"
                >
                  No registered businesses found.
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

    </main>
  );
}
