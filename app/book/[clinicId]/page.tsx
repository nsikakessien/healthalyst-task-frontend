"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ChevronRight,
  Lock,
} from "lucide-react";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  lockedUntil: string | null;
}

export default function EnhancedBookingPage({
  params,
}: {
  params: { clinicId: string };
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [holdTimer, setHoldTimer] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  // 1. Fetch Slots
  useEffect(() => {
    setLoadingSlots(true);
    fetch(`${API_URL}/clinics/${params.clinicId}/slots`)
      .then((res) => res.json())
      .then((data: Slot[]) => {
        setSlots(data);
        if (data.length > 0) {
          const firstAvailable = data.find((s) => !s.isBooked);
          if (firstAvailable) {
            setSelectedDate(
              new Date(firstAvailable.startTime).toISOString().split("T")[0],
            );
          }
        }
      })
      .finally(() => setLoadingSlots(false));
  }, [params.clinicId, API_URL]);

  // Extract dates that have available slots
  const availableDates = Array.from(
    new Set(
      slots
        .filter((s) => !s.isBooked)
        .map((s) => new Date(s.startTime).toISOString().split("T")[0]),
    ),
  );

  const filteredSlots = slots.filter(
    (slot) =>
      new Date(slot.startTime).toISOString().split("T")[0] === selectedDate,
  );

  // Auth Guard & Hold Action
  const handleHoldSlot = async (slot: Slot) => {
    const token = localStorage.getItem("jwt_token");

    // Redirect unauthenticated users immediately
    if (!token) {
      router.push(`/login?redirect=/book/${params.clinicId}`);
      return;
    }

    setHolding(true);
    try {
      const res = await fetch(`${API_URL}/bookings/slots/${slot.id}/hold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": params.clinicId,
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setSelectedSlot(slot);
        setHoldTimer(300); // 5-minute lock countdown
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to lock slot.");
    } finally {
      setHolding(false);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (holdTimer === null || holdTimer <= 0) return;
    const interval = setInterval(
      () => setHoldTimer((t) => (t ? t - 1 : 0)),
      1000,
    );
    return () => clearInterval(interval);
  }, [holdTimer]);

  // Confirm Final Booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    const token = localStorage.getItem("jwt_token");

    setConfirming(true);
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": params.clinicId,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotId: selectedSlot.id }),
      });

      if (res.ok) {
        setBookingSuccess(true);
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } finally {
      setConfirming(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md text-center p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl"
        >
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Appointment Confirmed!</h2>
          <p className="text-slate-400 text-sm mt-2">
            Your booking has been registered on the admin portal dashboard.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 px-6 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-700"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 max-w-5xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Book Consultation Slot
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Select an open calendar date and time window below.
          </p>
        </div>
      </header>

      {/* Step 1: Custom Date Selector Bar */}
      <section className="mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-teal-400" /> Select Consultation
          Date
        </h3>

        {loadingSlots ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 w-32 bg-slate-900/60 animate-pulse rounded-2xl border border-slate-800/50"
              />
            ))}
          </div>
        ) : availableDates.length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-300">
              No available dates found for this clinic.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {availableDates.map((dateStr) => {
              const d = new Date(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`px-5 py-3 rounded-2xl border text-center transition-all flex-shrink-0 ${
                    isSelected
                      ? "bg-teal-950/80 border-teal-500 text-teal-200 ring-2 ring-teal-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs uppercase font-medium">
                    {d.toLocaleDateString([], { weekday: "short" })}
                  </div>
                  <div className="text-lg font-bold text-slate-100">
                    {d.getDate()} {d.toLocaleDateString([], { month: "short" })}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 2: Time Slots Grid */}
      <section className="mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-400" /> Available Time Slots
        </h3>

        {loadingSlots ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-900/60 animate-pulse rounded-2xl border border-slate-800/50"
              />
            ))}
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="p-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center text-slate-500 text-sm">
            No open slots remaining on this date.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSlots.map((slot) => {
              const isHeld =
                slot.lockedUntil && new Date(slot.lockedUntil) > new Date();
              const isDisabled =
                slot.isBooked || (isHeld && selectedSlot?.id !== slot.id);

              return (
                <motion.button
                  key={slot.id}
                  whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                  whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                  disabled={isDisabled || holding}
                  onClick={() => handleHoldSlot(slot)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    slot.isBooked
                      ? "bg-slate-900/30 border-slate-900 text-slate-600 cursor-not-allowed"
                      : selectedSlot?.id === slot.id
                        ? "bg-teal-950/60 border-teal-500 text-teal-200 ring-2 ring-teal-500/30"
                        : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="text-base font-semibold">
                    {new Date(slot.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-medium ${
                        slot.isBooked
                          ? "bg-red-950/40 text-red-500"
                          : isHeld
                            ? "bg-amber-950/40 text-amber-400"
                            : "bg-emerald-950/40 text-emerald-400"
                      }`}
                    >
                      {slot.isBooked
                        ? "Booked"
                        : isHeld
                          ? "Locked"
                          : "Available"}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 3: Reservation Bar */}
      <AnimatePresence>
        {selectedSlot && holdTimer !== null && holdTimer > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-6 bg-slate-900 border border-teal-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl"
          >
            <div>
              <p className="font-semibold text-teal-400 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Slot Reserved Exclusively For You
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Hold expires in:{" "}
                <span className="font-mono text-slate-100 font-bold">
                  {Math.floor(holdTimer / 60)}:
                  {(holdTimer % 60).toString().padStart(2, "0")}
                </span>
              </p>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={confirming}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 font-semibold text-slate-950 rounded-xl hover:brightness-110 flex items-center justify-center gap-2"
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Booking"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
