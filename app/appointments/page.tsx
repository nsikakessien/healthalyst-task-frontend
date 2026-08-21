"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CalendarX, Loader2, Radio } from "lucide-react";
import { io } from "socket.io-client";
import PortalHeader from "@/app/components/PortalHeader";
import { clearAuthSession } from "@/lib/auth";

interface Appointment {
  id: string;
  status: string;
  createdAt: string;
  patientPhone: string | null;
  patientDateOfBirth: string | null;
  patientReason: string | null;
  appointmentStart: string;
  appointmentEnd: string;
  clinic: { name: string };
  slot: { startTime: string; endTime: string } | null;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || apiUrl.replace(/\/api\/v1\/?$/, "");

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${apiUrl}/bookings/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load appointment history.");
        setAppointments(Array.isArray(data) ? data : []);
        setError("");
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load appointment history.";
        setError(message);
        if (message.toLowerCase().includes("token")) {
          clearAuthSession();
          window.location.href = "/login?redirect=/appointments";
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();

    const socket = io(socketUrl, { auth: { token } });
    socket.on("connect", () => setRealtimeConnected(true));
    socket.on("disconnect", () => setRealtimeConnected(false));
    socket.on("connect_error", () => setRealtimeConnected(false));
    const fallbackPolling = window.setInterval(() => {
      if (!socket.connected) void fetchHistory();
    }, 5000);
    socket.on("booking:updated", (booking: Appointment) => {
      setAppointments((current) => {
        const exists = current.some((item) => item.id === booking.id);
        return exists
          ? current.map((item) =>
              item.id === booking.id ? { ...item, ...booking } : item,
            )
          : [booking, ...current];
      });
    });

    return () => {
      socket.close();
      window.clearInterval(fallbackPolling);
    };
  }, [apiUrl, socketUrl]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-12">
      <div className="mx-auto max-w-5xl">
        <PortalHeader />
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
            Patient portal
          </p>
          <h1 className="mt-2 text-3xl font-bold">Appointment history</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
            <Radio
              className={`h-3.5 w-3.5 ${realtimeConnected ? "text-emerald-400" : "text-slate-600"}`}
            />
            {realtimeConnected
              ? "Live appointment status updates"
              : "Connecting to live updates..."}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
            <Loader2 className="h-7 w-7 animate-spin text-teal-400" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-900/50 bg-slate-900 p-8 text-center text-sm text-red-300">
            {error}
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
            <CalendarX className="mx-auto h-10 w-10 text-slate-600" />
            <h2 className="mt-4 font-semibold text-slate-200">
              No appointments yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Your confirmed appointments will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-800/50 text-xs uppercase tracking-wider text-slate-300">
                <tr>
                  <th className="px-5 py-4">Clinic</th>
                  <th className="px-5 py-4">Appointment</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="text-slate-300">
                    <td className="px-5 py-4 font-semibold text-teal-300">
                      {appointment.clinic.name}
                    </td>
                    <td className="px-5 py-4">
                      {new Date(
                        appointment.slot?.startTime ||
                          appointment.appointmentStart,
                      ).toLocaleString()}
                    </td>
                    <td className="max-w-xs px-5 py-4 text-slate-400">
                      {appointment.patientReason || "General consultation"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${appointment.status === "PENDING" ? "border-amber-800/50 bg-amber-950/60 text-amber-300" : appointment.status === "CANCELLED" ? "border-red-800/50 bg-red-950/60 text-red-300" : "border-emerald-800/50 bg-emerald-950/60 text-emerald-400"}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
