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

    const { error } = await supabase.auth.signUp({
      email: formData.email.trim().toLowerCase(),
      password: "TEMP_PASSWORD",
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: {
          business_name: formData.business_name,
          owner_name: formData.owner_name,
          phone: formData.phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setMessage({
          type: "error",
          text: "⚠️ Registration already exists.\n\nA business registration using this email address or phone number has already been submitted.\n\nIf your account is awaiting approval, please wait for an administrator to review it.\n\nIf you believe this is a mistake, please contact the system administrator.",
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
      text: "Registration submitted successfully. Your account will be reviewed before activation.",
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
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Register Your Business
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Join KopaAlert and automate customer debt reminders through SMS
            notifications.
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 whitespace-pre-line rounded-lg border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Business Name
            </label>

            <input
              name="business_name"
              type="text"
              required
              value={formData.business_name}
              onChange={handleChange}
              placeholder="ABC Electronics"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Owner Name</label>

            <input
              name="owner_name"
              type="text"
              required
              value={formData.owner_name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number
            </label>

            <input
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+254712345678"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email Address
            </label>

            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="owner@business.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-white font-medium transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Register Business"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
