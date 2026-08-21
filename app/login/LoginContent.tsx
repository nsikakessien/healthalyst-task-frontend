"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginContent() {
  const [email, setEmail] = useState("patient@demo.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/clinics";
  const portal =
    searchParams.get("portal") ||
    (redirectPath.startsWith("/admin") ? "admin" : "patient");
  const isAdminPortal = portal === "admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Ensures cookies set by backend are stored in browser
          body: JSON.stringify({ email, password, portal }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        // Fallback cookie for client-side JavaScript access if cross-origin
        document.cookie = `jwt_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        router.push(redirectPath);
        router.refresh(); // Refresh Next.js router cache to update middleware state
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError("Network connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
      <form
        onSubmit={handleLogin}
        className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">
          {isAdminPortal ? "Admin Portal Sign In" : "Patient Portal Sign In"}
        </h2>
        {error && (
          <div className="p-3 bg-red-950/50 text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200"
          placeholder="Email"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pr-11 text-sm text-slate-200"
            placeholder="Password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-teal-500 text-slate-950 font-semibold rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
        <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
          {isAdminPortal
            ? "Looking to book an appointment?"
            : "Clinic administrator?"}{" "}
          <Link
            href={
              isAdminPortal
                ? "/login?portal=patient&redirect=/clinics"
                : "/login?portal=admin&redirect=/admin/dashboard"
            }
            className="font-semibold text-teal-400 hover:text-teal-300"
          >
            {isAdminPortal ? "Sign in as a patient" : "Sign in as admin"}
          </Link>
        </div>
      </form>
    </div>
  );
}
