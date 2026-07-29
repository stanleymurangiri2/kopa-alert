import { Resend } from "resend";


function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}


export async function sendEmail({
  to,
  subject,
  html,
}: {
  to:string;
  subject:string;
  html:string;
}) {


  const resend = getResend();

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }

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