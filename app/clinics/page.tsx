"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  Search,
  MapPin,
  Calendar,
  Lock,
  ArrowRight,
  X,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { clearAuthSession, isAuthenticated } from "@/lib/auth";
import PortalHeader from "@/app/components/PortalHeader";

interface Clinic {
  id: string;
  name: string;
  address: string;
  specialty: string;
  availableSlotsCount: number;
}

export default function ProtectedClinicsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [navigatingClinicId, setNavigatingClinicId] = useState<string | null>(
    null,
  );
  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  // Auth Protection Check
  useEffect(() => {
    const checkAuth = isAuthenticated();
    setAuthed(checkAuth);

    if (checkAuth) {
      const token = localStorage.getItem("jwt_token");
      fetch(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Unable to load clinics.");
          return data;
        })
        .then((data) => {
          if (Array.isArray(data)) setClinics(data);
        })
        .catch((requestError: Error) => {
          setError(requestError.message);
          if (requestError.message.toLowerCase().includes("token")) {
            clearAuthSession();
            router.push("/login?redirect=/clinics");
          }
        })
        .finally(() => setLoading(false));
    }
  }, [API_URL]);

  // Render Loading State while checking auth
  if (authed === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // 1. Sign-In Guard Banner (When NOT Authenticated)
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-2xl space-y-6"
        >
          <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              Authentication Required
            </h2>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              You must be signed in to access the clinic directory, view open
              consultation slots, and reserve appointments.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-left flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Patient data and clinic booking schedules are protected under
              tenant access controls.
            </p>
          </div>

          <button
            onClick={() => router.push("/login?redirect=/clinics")}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-blue-600 font-semibold text-slate-950 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            Sign In to Continue <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  const filteredClinics = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.specialty?.toLowerCase().includes(search.toLowerCase()),
  );

  // 2. Full Clinic Directory View (When Authenticated)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 max-w-6xl mx-auto">
      <PortalHeader showBack={false} />
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Available Clinics & Hospitals
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Select a verified medical center to book your consultation.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by clinic or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear clinic search"
              title="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Directory Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-slate-900/60 animate-pulse rounded-2xl border border-slate-800/50"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-12 bg-slate-900 border border-red-900/50 rounded-2xl text-center text-red-300 text-sm">
          {error}
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
          No clinics match your search parameters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClinics.map((clinic) => (
            <motion.div
              key={clinic.id}
              whileHover={{ y: -4 }}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-2xl flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-teal-950/60 border border-teal-800/50 rounded-xl flex items-center justify-center text-teal-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {clinic.specialty || "General Health"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-teal-400 transition-colors">
                  {clinic.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  {clinic.address || "Central Healthcare Complex"}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">
                    {clinic.availableSlotsCount ?? 8}
                  </span>{" "}
                  slots open
                </span>

                <button
                  onClick={() => {
                    setNavigatingClinicId(clinic.id);
                    router.push(`/book/${clinic.id}`);
                  }}
                  disabled={navigatingClinicId !== null}
                  className="px-4 py-2 bg-teal-500 text-slate-950 font-semibold text-xs rounded-xl hover:bg-teal-400 transition-colors flex items-center gap-1.5 disabled:cursor-wait disabled:opacity-60"
                >
                  {navigatingClinicId === clinic.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  {navigatingClinicId === clinic.id
                    ? "Opening..."
                    : "Book Slot"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
