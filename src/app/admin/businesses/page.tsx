import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessesPage() {
  const supabase = await createClient();

  const { data: businesses } = await supabase
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

  return (
    <main className="p-8">

      <h1 className="text-3xl font-bold mb-8">
        Business Management
      </h1>

      <div className="overflow-x-auto rounded-xl bg-white shadow">

        <table className="w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-6 py-4 text-left">
                Code
              </th>

              <th className="px-6 py-4 text-left">
                Business
              </th>

              <th className="px-6 py-4 text-left">
                Phone
              </th>

              <th className="px-6 py-4 text-left">
                Email
              </th>

              <th className="px-6 py-4 text-left">
                Status
              </th>

              <th className="px-6 py-4 text-left">
                Action
              </th>

            </tr>

          </thead>

          <tbody>

            {businesses?.map((business) => (

              <tr
                key={business.id}
                className="border-t"
              >

                <td className="px-6 py-4">
                  {business.business_code}
                </td>

                <td className="px-6 py-4 font-medium">
                  {business.business_name}
                </td>

                <td className="px-6 py-4">
                  {business.phone}
                </td>

                <td className="px-6 py-4">
                  {business.email}
                </td>

                <td className="px-6 py-4">

                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                    {business.status}
                  </span>

                </td>

                <td className="px-6 py-4">

                  <Link
                    href={`/admin/businesses/${business.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </main>
  );
}
