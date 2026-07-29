import AfricasTalking from "africastalking";

function getSMSClient() {
  const username = (process.env.AT_USERNAME || "sandbox").trim();
  const apiKey = (process.env.AT_API_KEY || "sandbox_key").trim();
  try {
    const client = AfricasTalking({
      username: username || "sandbox",
      apiKey: apiKey || "dummy_key",
    });
    return client.SMS;
  } catch (err) {
    console.warn("AfricasTalking initialization warning:", err);
    return null;
  }
}

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
    const sms = getSMSClient();
    if (!sms) {
      return {
        success: false,
        error: "SMS gateway client is not configured.",
      };
    }
    const senderId = (process.env.AT_SENDER_ID || "").trim();
    const payload: {
      to: string[];
      message: string;
      from?: string;
    } = {
      to: [phone],
      message,
    };
    if (senderId !== "") {
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
    const sms = getSMSClient();
    if (!sms) {
      return {
        success: false,
        error: "SMS gateway client is not configured.",
      };
    }
    const senderId = (process.env.AT_SENDER_ID || "").trim();
    const payload: {
      to: string[];
      message: string;
      from?: string;
    } = {
      to: phones,
      message,
    };
    if (senderId !== "") {
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