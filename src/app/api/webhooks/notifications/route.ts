// Location: src/app/api/webhooks/notifications/route.ts

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

type NotificationPayload = {
  tenantId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
};

function AlertEmailTemplate({
  userName,
  title,
  message,
  actionUrl,
}: {
  userName: string;
  title: string;
  message: string;
  actionUrl?: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2>${title}</h2>
      <p>Hello ${userName},</p>
      <p>${message}</p>
      ${
        actionUrl
          ? `<p><a href="${actionUrl}" style="color:#2563eb;">View Details</a></p>`
          : ""
      }
    </div>
  `;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey);
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

export async function POST(request: Request) {
  try {
    const body: NotificationPayload = await request.json();

    const {
      tenantId,
      userId,
      userEmail,
      userName,
      title,
      message,
      type,
      actionUrl,
    } = body;

    if (!tenantId || !userId || !title || !message) {
      return NextResponse.json(
        {
          error: "Missing required payload fields.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("notifications")
      .insert([
        {
          tenant_id: tenantId,
          user_id: userId,
          title,
          message,
          type: type ?? "info",
        },
      ]);

    if (error) {
      throw error;
    }

    if (userEmail) {
      const resend = getResend();

      if (resend) {
        await resend.emails.send({
          from: "Notifications <notifications@yourdomain.com>",
          to: [userEmail],
          subject: title,
          html: AlertEmailTemplate({
            userName: userName ?? "User",
            title,
            message,
            actionUrl,
          }),
        });
      } else {
        console.warn(
          "RESEND_API_KEY is not configured. Email notification skipped."
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notification dispatched successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}