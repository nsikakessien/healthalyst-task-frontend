"use client";

import { useState, useEffect } from "react";
import { CalendarX, Loader2, Building, Radio } from "lucide-react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import PortalHeader from "@/app/components/PortalHeader";
import { clearAuthSession } from "@/lib/auth";

interface BookingRecord {
  id: string;
  status: string;
  createdAt: string;
  patient: { name: string; email: string };
  patientPhone?: string | null;
  patientReason?: string | null;
  slot: { startTime: string; endTime: string };
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState("");
  const [connected, setConnected] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchBookings = () => {
    setLoading(true);
    const token = localStorage.getItem("jwt_token");

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/bookings/admin`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Unable to load appointments.");
        return data;
      })
      .then((data) => {
        if (Array.isArray(data)) setBookings(data);
      })
      .catch((requestError: Error) => {
        setError(requestError.message);
        if (
          requestError.message.includes("Authentication") ||
          requestError.message.includes("token")
        ) {
          clearAuthSession();
          router.push("/login?redirect=/admin/dashboard");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === "ADMIN" && user.clinicId) {
          setAuthorized(true);
          setClinicName(user.name);
          fetchBookings();

          const socket = io(
            process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
            { auth: { token: localStorage.getItem("jwt_token") } },
          );
          socket.on("connect", () => setConnected(true));
          socket.on("disconnect", () => setConnected(false));
          socket.on("booking:created", (booking: BookingRecord) => {
            if (!booking?.id || !booking.patient || !booking.slot) return;
            setBookings((current) =>
              current.some((item) => item.id === booking.id)
                ? current
                : [booking, ...current],
            );
          });
          return () => {
            socket.close();
          };
        }
      } catch {
        clearAuthSession();
      }
    }
    setAuthorized((current) => current ?? false);
  }, []);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md text-center rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <CalendarX className="mx-auto mb-4 h-10 w-10 text-amber-400" />
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with an authorized clinic administrator account.
          </p>
          <button
            onClick={() => router.push("/login?redirect=/admin/dashboard")}
            className="mt-6 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-slate-950"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <PortalHeader />
      <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clinic Admin Dashboard</h1>
          <p className="text-slate-400 text-xs">
            {clinicName}&apos;s clinic appointments
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Building className="w-4 h-4 text-teal-400" />
          <Radio
            className={`w-3.5 h-3.5 ${connected ? "text-emerald-400" : "text-slate-600"}`}
          />
          {connected ? "Live updates" : "Connecting..."}
        </div>
      </header>

      <main className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-800/50 text-slate-200 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Appointment Time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-6 py-4">
                    <div className="h-4 bg-slate-800/50 animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-red-300">
                  {error}
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-500">
                  <CalendarX className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">
                    No appointment bookings found for this tenant ID.
                  </p>
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-200">
                    {b.patient.name}
                    <div className="text-xs text-slate-500">
                      {b.patient.email}
                    </div>
                    {b.patientPhone && (
                      <div className="text-xs text-slate-500">
                        {b.patientPhone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(b.slot.startTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {b.patientReason || "General consultation"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
