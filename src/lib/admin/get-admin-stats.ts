import { createClient } from "@/lib/supabase/server";


export async function getAdminStats() {

  const supabase = await createClient();


  const [
    pendingResult,
    approvedResult,
    rejectedResult,
    businessesResult,
  ] = await Promise.all([


    supabase
      .from("business_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "pending"
      ),



    supabase
      .from("business_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "approved"
      ),



    supabase
      .from("business_requests")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "rejected"
      ),



    supabase
      .from("businesses")
      .select("*", {
        count: "exact",
        head: true,
      }),


  ]);



  return {

    pending:
      pendingResult.count ?? 0,


    approved:
      approvedResult.count ?? 0,


    rejected:
      rejectedResult.count ?? 0,


    businesses:
      businessesResult.count ?? 0,

  };

}