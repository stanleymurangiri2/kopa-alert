import { Resend } from "resend";


const resend = new Resend(
  process.env.RESEND_API_KEY
);


export async function sendEmail({
  to,
  subject,
  html,
}: {
  to:string;
  subject:string;
  html:string;
}) {


  const result =
    await resend.emails.send({

      from:
      "KopaAlert <noreply@yourdomain.com>",

      to,

      subject,

      html,

    });


  return result;

}