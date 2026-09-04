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

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (authError) {
        setError(authError.message);
        return;
      }

      const user = data.user;

      if (!user) {
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
        setError("Unable to verify your account.");
        return;
      }

      if (profile.role !== "super_admin") {
        await supabase.auth.signOut();
        setError(
          "Access denied. This portal is for Super Administrators only."
        );
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-700">
            KopaAlert
          </h1>

          <p className="mt-2 text-gray-600">
            Super Administrator Login
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1 block text-sm font-medium"
            >
              Email Address
            </label>

            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              placeholder="admin@kopaalert.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In as Super Admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
