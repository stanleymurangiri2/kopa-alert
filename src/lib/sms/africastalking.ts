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
  messageId?: string;
}

function extractRecipientResult(response: any) {
  const recipients = response?.SMSMessageData?.Recipients;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { ok: false, reason: "No recipient data returned by gateway." };
  }

  const recipient = recipients[0];

  // Africa's Talking uses statusCode 101 or 102 for accepted/queued;
  // anything else (InvalidPhoneNumber, InsufficientBalance, etc.) is a real failure
  const isSuccess =
    recipient.status === "Success" ||
    recipient.statusCode === 101 ||
    recipient.statusCode === 102;

  if (!isSuccess) {
    return {
      ok: false,
      reason: recipient.status || "Unknown gateway rejection.",
    };
  }

  return { ok: true, messageId: recipient.messageId };
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

    const result = extractRecipientResult(response);

    if (!result.ok) {
      return {
        success: false,
        error: result.reason,
        data: response,
      };
    }

    return {
      success: true,
      data: response,
      messageId: result.messageId,
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