"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FormData = {
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
};

export default function BusinessRegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState<FormData>({
    business_name: "",
    owner_name: "",
    phone: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.from("business_requests").insert({
      business_name: formData.business_name,
      owner_name: formData.owner_name,
      phone: formData.phone,
      email: formData.email.trim().toLowerCase(),
      status: "pending",
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setMessage({
          type: "error",
          text:
            "⚠️ Registration already exists.\n\nA business registration using this email address or phone number has already been submitted.\n\nIf your account is awaiting approval, please wait for an administrator to review it.\n\nIf you believe this is a mistake, please contact the system administrator.",
        });
      } else {
        setMessage({
          type: "error",
          text: error.message,
        });
      }
      return;
    }

    setMessage({
      type: "success",
      text:
        "Registration submitted successfully. Your account will be reviewed before activation.",
    });

    setFormData({
      business_name: "",
      owner_name: "",
      phone: "",
      email: "",
    });

    setTimeout(() => {
      router.push("/register/success");
    }, 1500);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-xl bg-card shadow-lg border border-border p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Register Your Business
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Join KopaAlert and automate customer debt reminders through SMS
            notifications.
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 whitespace-pre-line rounded-lg border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Business Name
            </label>

            <input
              name="business_name"
              type="text"
              required
              value={formData.business_name}
              onChange={handleChange}
              placeholder="ABC Electronics"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Owner Name
            </label>

            <input
              name="owner_name"
              type="text"
              required
              value={formData.owner_name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Phone Number
            </label>

            <input
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+254712345678"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Email Address
            </label>

            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="owner@business.com"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 text-primary-foreground font-medium transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Register Business"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}