"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { clearAuthSession } from "@/lib/auth";

interface UserSession {
  name: string;
  role: "PATIENT" | "ADMIN";
}

export default function PortalHeader() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        clearAuthSession();
      }
    }
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearAuthSession();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          title="Go back"
          className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-teal-500 hover:text-teal-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Link
          href={user?.role === "ADMIN" ? "/admin/dashboard" : "/clinics"}
          className="text-lg font-bold text-teal-400"
        >
          PulseBook
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="hidden text-xs text-slate-400 sm:inline">
            {user.name} · {user.role === "ADMIN" ? "Admin" : "Patient"}
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}
