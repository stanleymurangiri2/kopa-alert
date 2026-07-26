import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function POST(
 request: NextRequest
){

 const supabase =
 createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
 );


 try {


 const {requestId}
 =
 await request.json();



 if(!requestId){

 return NextResponse.json(
 {
 error:"Missing requestId."
 },
 {
 status:400
 }
 );

 }



 const {error}
 =
 await supabase
 .from("business_requests")
 .update({
 status:"rejected",
 })
 .eq(
 "id",
 requestId
 );



 if(error){

 return NextResponse.json(
 {
 error:error.message
 },
 {
 status:500
 }
 );

 }

await supabase
  .from("audit_logs")
  .insert({
    admin_id: null,
    action: "REJECT_BUSINESS",
    target_type: "business_request",
    target_id: requestId,
    description: "Business registration rejected",
  });

 return NextResponse.json({

 success:true,

 message:
 "Registration rejected."

 });



 }catch(error){

 return NextResponse.json(
 {
 error:"Internal server error."
 },
 {
 status:500
 }
 );

 }


}