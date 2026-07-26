"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setLoading(false);
      setError("Authentication failed.");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setLoading(false);

      setError("Unable to verify your account.");

      return;
    }

    if (profile.role !== "super_admin") {
      await supabase.auth.signOut();

      setLoading(false);

      setError(
        "Access denied. This portal is for Super Administrators only."
      );

      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-lg">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">
            KopaAlert
          </h1>

          <p className="mt-2 text-gray-600">
            Super Administrator Login
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full rounded-lg border px-4 py-3"
              placeholder="admin@kopaalert.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full rounded-lg border px-4 py-3"
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Signing In..."
              : "Sign In as Super Admin"}
          </button>
        </form>
      </div>
    </main>
  );
}