import Africastalking from "africastalking";

function getSmsClient() {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;

  if (!username || !apiKey) {
    throw new Error(
      "Africa's Talking credentials (AT_USERNAME, AT_API_KEY) are not configured"
    );
  }

  return Africastalking({ username, apiKey }).SMS;
}

export async function sendSMS({
  phone,
  message,
}: {
  phone: string;
  message: string;
}) {
  const sms = getSmsClient();

  return await sms.send({
    to: [phone],
    message,
  });
}
