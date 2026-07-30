import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "solutiontechcampany@gmail.com",
    pass: "zddbtoyneyksjjir",
  },
});

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  try {
    await transporter.sendMail({
      from: '"KopaAlert" <solutiontechcampany@gmail.com>',
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Nodemailer error:", error);
    return { success: false, error: "Failed to send email" };
  }
}