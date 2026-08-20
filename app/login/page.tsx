"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("patient@demo.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/clinics";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Ensures cookies set by backend are stored in browser
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        // Fallback cookie for client-side JavaScript access if cross-origin
        document.cookie = `jwt_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem("user", JSON.stringify(data.user));

        router.push(redirectPath);
        router.refresh(); // Refresh Next.js router cache to update middleware state
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError("Network connection error.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
      <form
        onSubmit={handleLogin}
        className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Sign In to Continue</h2>
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200"
          placeholder="Password"
        />
        <button
          type="submit"
          className="w-full py-3 bg-teal-500 text-slate-950 font-semibold rounded-xl"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
