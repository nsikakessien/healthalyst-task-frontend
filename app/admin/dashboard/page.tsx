"use client";

import { useState, useEffect } from "react";
import { CalendarX, Loader2, Building } from "lucide-react";

interface BookingRecord {
  id: string;
  status: string;
  createdAt: string;
  patient: { name: string; email: string };
  slot: { startTime: string; endTime: string };
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  const fetchBookings = (targetClinicId: string) => {
    if (!targetClinicId) return;
    setLoading(true);
    const token = localStorage.getItem("jwt_token");

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/bookings/admin`,
      {
        headers: {
          "x-clinic-id": targetClinicId,
          Authorization: `Bearer ${token}`,
        },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBookings(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.clinicId) {
        setClinicId(user.clinicId);
        fetchBookings(user.clinicId);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clinic Admin Dashboard</h1>
          <p className="text-slate-400 text-xs">
            Real-time tenant booking entries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Clinic Tenant ID..."
            value={clinicId}
            onChange={(e) => {
              setClinicId(e.target.value);
              fetchBookings(e.target.value);
            }}
            className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 w-64 focus:outline-none focus:border-teal-500"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-800/50 text-slate-200 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Appointment Time</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Booked Date</th>
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
                    {new Date(b.createdAt).toLocaleDateString()}
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
