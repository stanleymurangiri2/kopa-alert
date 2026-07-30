const EMAILJS_SERVICE_ID = "kopa-alert";
const EMAILJS_PUBLIC_KEY = "t1G3T8KRpKzfK7m6a";
const EMAILJS_PRIVATE_KEY = "iwBWwTWVtVBDLMis9rO7p";

interface SendEmailParams {
  templateId: string;
  params: Record<string, string>;
}

export async function sendEmailJS({ templateId, params }: SendEmailParams) {
  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: params,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("EmailJS send failed:", text);
      return { success: false, error: text };
    }

    return { success: true };
  } catch (error) {
    console.error("EmailJS error:", error);
    return { success: false, error: "Failed to send email" };
  }
}