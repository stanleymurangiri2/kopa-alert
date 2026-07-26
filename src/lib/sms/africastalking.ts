import AfricasTalking from "africastalking";

const username = process.env.AT_USERNAME ?? "";
const apiKey = process.env.AT_API_KEY ?? "";
const senderId = process.env.AT_SENDER_ID ?? "";

const africastalking = AfricasTalking({
  username,
  apiKey,
});

const sms = africastalking.SMS;

export interface SendSMSResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function sendSMS(
  phone: string,
  message: string
): Promise<SendSMSResult> {
  try {
    const payload: {
      to: string[];
      message: string;
      from?: string;
    } = {
      to: [phone],
      message,
    };

    // Do not send "from" if it isn't configured.
    // Africa's Talking sandbox works without it.
    if (senderId.trim() !== "") {
      payload.from = senderId;
    }

    const response = await sms.send(payload);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Africa's Talking SMS Error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send SMS",
    };
  }
}

export async function sendBulkSMS(
  phones: string[],
  message: string
): Promise<SendSMSResult> {
  try {
    const payload: {
      to: string[];
      message: string;
      from?: string;
    } = {
      to: phones,
      message,
    };

    if (senderId.trim() !== "") {
      payload.from = senderId;
    }

    const response = await sms.send(payload);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error("Africa's Talking Bulk SMS Error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send bulk SMS",
    };
  }
}

export async function testSMS(
  phone: string
): Promise<SendSMSResult> {
  return sendSMS(
    phone,
    "KopaAlert test message. Your SMS gateway is working successfully."
  );
}