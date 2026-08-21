"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Lock,
} from "lucide-react";
import PortalHeader from "@/app/components/PortalHeader";
import { clearAuthSession } from "@/lib/auth";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  lockedBy: string | null;
  lockedUntil: string | null;
}

interface PatientDetails {
  email: string;
  phone: string;
  dateOfBirth: string;
  reason: string;
}

interface FieldErrors {
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  reason?: string;
}

interface ConfirmedBooking {
  id: string;
  status: string;
  patientEmail: string;
  patientPhone: string;
  patientReason: string;
  clinic: { name: string };
  slot: { startTime: string; endTime: string };
  emailSent: boolean;
}

const padDatePart = (value: number) => value.toString().padStart(2, "0");

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const dateFromKey = (value: string) => new Date(`${value}T12:00:00`);

const monthTitle = (date: Date) =>
  date.toLocaleDateString([], { month: "long", year: "numeric" });

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Date(2024, month, 1).toLocaleDateString([], { month: "long" }),
);

const calendarDays = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const leadingDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1),
    ),
  ];
};

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
  const [confirmedBooking, setConfirmedBooking] =
    useState<ConfirmedBooking | null>(null);
  const [slotsError, setSlotsError] = useState("");
  const [appointmentMonth, setAppointmentMonth] = useState(new Date());
  const [dobMonth, setDobMonth] = useState(new Date());
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [clinicName, setClinicName] = useState("Clinic");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [modal, setModal] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({
    email: "",
    phone: "",
    dateOfBirth: "",
    reason: "",
  });

  const router = useRouter();
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  // 1. Fetch Slots
  useEffect(() => {
    setLoadingSlots(true);
    const token = localStorage.getItem("jwt_token");
    const storedUser = localStorage.getItem("user");
    let userId: string | null = null;
    if (storedUser) {
      try {
        userId = JSON.parse(storedUser).id || null;
      } catch {
        userId = null;
      }
    }
    setCurrentUserId(userId);
    if (storedUser) {
      try {
        setPatientDetails((current) => ({
          ...current,
          email: JSON.parse(storedUser).email || "",
        }));
      } catch {
        // The authentication guard handles malformed sessions.
      }
    }
    fetch(`${API_URL}/clinics/${params.clinicId}/slots`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Unable to load appointment slots.");
        return data;
      })
      .then((data: Slot[]) => {
        const loadedSlots = Array.isArray(data) ? data : [];
        setSlots(loadedSlots);
        const now = Date.now();
        const ownHold = loadedSlots.find(
          (slot) =>
            !slot.isBooked &&
            slot.lockedBy === userId &&
            slot.lockedUntil &&
            new Date(slot.lockedUntil).getTime() > now,
        );
        const firstAvailable =
          ownHold ||
          loadedSlots.find(
            (slot) =>
              !slot.isBooked &&
              (!slot.lockedUntil ||
                new Date(slot.lockedUntil).getTime() <= now),
          );
        if (ownHold) {
          const remainingSeconds = Math.ceil(
            (new Date(ownHold.lockedUntil!).getTime() - now) / 1000,
          );
          setSelectedSlot(ownHold);
          setHoldTimer(remainingSeconds);
        }
        if (firstAvailable) {
          const firstDate = new Date(firstAvailable.startTime);
          setSelectedDate(dateKey(firstDate));
          setAppointmentMonth(
            new Date(firstDate.getFullYear(), firstDate.getMonth(), 1),
          );
        }
      })
      .catch((requestError: Error) => {
        setSlotsError(requestError.message);
        if (requestError.message.toLowerCase().includes("token")) {
          clearAuthSession();
          router.push(`/login?redirect=/book/${params.clinicId}`);
        }
      })
      .finally(() => setLoadingSlots(false));

    fetch(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const clinic = Array.isArray(data)
          ? data.find(
              (item: { id: string; name: string }) =>
                item.id === params.clinicId,
            )
          : null;
        if (clinic) setClinicName(clinic.name);
      });
  }, [params.clinicId, API_URL]);

  // Extract dates that have available slots
  const availableDates = Array.from(
    new Set(
      slots
        .filter(
          (slot) =>
            !slot.isBooked &&
            (!slot.lockedUntil ||
              new Date(slot.lockedUntil).getTime() <= Date.now() ||
              slot.lockedBy === currentUserId),
        )
        .map((s) => dateKey(new Date(s.startTime))),
    ),
  );

  const filteredSlots = slots.filter(
    (slot) => dateKey(new Date(slot.startTime)) === selectedDate,
  );

  const today = new Date();
  const todayKey = dateKey(today);
  const appointmentCalendarDays = calendarDays(appointmentMonth);
  const dobCalendarDays = calendarDays(dobMonth);
  const birthYears = Array.from(
    { length: today.getFullYear() - 1900 + 1 },
    (_, index) => today.getFullYear() - index,
  );

  const changeMonth = (
    currentMonth: Date,
    setMonth: (month: Date) => void,
    offset: number,
  ) => {
    setMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  };

  // Auth Guard & Hold Action
  const holdSlot = async (slot: Slot) => {
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
        const heldSlot = {
          ...slot,
          lockedBy: currentUserId,
          lockedUntil: data.slot.lockedUntil,
        };
        setSlots((currentSlots) =>
          currentSlots.map((currentSlot) => {
            if (currentSlot.id === selectedSlot?.id) {
              return { ...currentSlot, lockedBy: null, lockedUntil: null };
            }
            if (currentSlot.id === slot.id) {
              return { ...currentSlot, lockedUntil: data.slot.lockedUntil };
            }
            return currentSlot;
          }),
        );
        setSelectedSlot(heldSlot);
        setHoldTimer(
          Math.ceil(
            (new Date(data.slot.lockedUntil).getTime() - Date.now()) / 1000,
          ),
        );
      } else {
        setModal({
          title: "Slot unavailable",
          message: data.error || "This slot could not be held.",
        });
      }
    } catch (err) {
      setModal({
        title: "Unable to hold slot",
        message: "Please check your connection and try again.",
      });
    } finally {
      setHolding(false);
    }
  };

  const handleHoldSlot = (slot: Slot) => {
    if (selectedSlot?.id === slot.id) return;
    if (selectedSlot && holdTimer !== null && holdTimer > 0) {
      setPendingSlot(slot);
      return;
    }
    void holdSlot(slot);
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

    const nextErrors: FieldErrors = {};
    const normalizedEmail = patientDetails.email.trim().toLowerCase();
    if (!normalizedEmail) nextErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      nextErrors.email = "Enter a valid email address.";
    const normalizedPhone = patientDetails.phone.replace(/[\s().-]/g, "");
    const isNigerianPhone = /^(?:0[789][01]\d{8}|\+234[789][01]\d{8})$/.test(
      normalizedPhone,
    );
    if (!patientDetails.phone.trim())
      nextErrors.phone = "Enter your phone number.";
    else if (!isNigerianPhone)
      nextErrors.phone =
        "Enter a valid Nigerian number, e.g. 08012345678 or +2348012345678.";
    if (!patientDetails.dateOfBirth)
      nextErrors.dateOfBirth = "Select your date of birth.";
    if (!patientDetails.reason.trim())
      nextErrors.reason = "Tell us the reason for your visit.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": params.clinicId,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          patientEmail: patientDetails.email,
          patientPhone: patientDetails.phone,
          patientDateOfBirth: patientDetails.dateOfBirth,
          patientReason: patientDetails.reason,
        }),
      });

      if (res.ok) {
        const booking = await res.json();
        setConfirmedBooking({
          ...booking,
          patientEmail: booking.patient.email,
          patientPhone: booking.patientPhone,
          patientReason: booking.patientReason,
          emailSent: booking.emailSent,
        });
        setBookingSuccess(true);
      } else {
        const data = await res.json();
        setModal({
          title: "Booking could not be confirmed",
          message: data.error || "Please try again.",
        });
      }
    } catch {
      setModal({
        title: "Booking could not be confirmed",
        message: "Please check your connection and try again.",
      });
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
          <h2 className="text-2xl font-bold">Appointment Request Submitted</h2>
          <p className="text-slate-400 text-sm mt-2">
            Your appointment is pending admin review.{" "}
            {confirmedBooking?.emailSent
              ? "A confirmation email was sent to your account email."
              : ""}
          </p>
          {confirmedBooking && (
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Clinic</span>
                <strong>{confirmedBooking.clinic.name}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Date</span>
                <strong>
                  {new Date(
                    confirmedBooking.slot.startTime,
                  ).toLocaleDateString()}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Time</span>
                <strong>
                  {new Date(confirmedBooking.slot.startTime).toLocaleTimeString(
                    [],
                    { hour: "numeric", minute: "2-digit" },
                  )}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Reason</span>
                <strong className="text-right">
                  {confirmedBooking.patientReason}
                </strong>
              </div>
            </div>
          )}
          <button
            onClick={() => router.push("/clinics")}
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
      <PortalHeader />
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">
            {clinicName}
          </p>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Book Consultation Slot
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Select an open calendar date and time window below.
          </p>
        </div>
      </header>

      {/* Step 1: Appointment calendar */}
      <section className="mb-8">
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <CalendarIcon className="h-4 w-4 text-teal-400" />
            <span>Appointment date</span>
            <span className="text-red-400" aria-hidden="true">
              *
            </span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Choose a date with available consultation times.
          </p>
        </div>

        {loadingSlots ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 w-32 bg-slate-900/60 animate-pulse rounded-2xl border border-slate-800/50"
              />
            ))}
          </div>
        ) : slotsError ? (
          <div className="p-6 bg-slate-900 border border-red-900/50 rounded-2xl text-center text-red-300 text-sm">
            {slotsError}
          </div>
        ) : availableDates.length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-slate-300">
              No available dates found for this clinic.
            </p>
          </div>
        ) : (
          <div className="max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  changeMonth(appointmentMonth, setAppointmentMonth, -1)
                }
                className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:border-teal-500 hover:text-teal-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-100">
                  {monthTitle(appointmentMonth)}
                </p>
                <p className="mt-1 text-[11px] text-teal-400">
                  {availableDates.length} dates available
                </p>
              </div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  changeMonth(appointmentMonth, setAppointmentMonth, 1)
                }
                className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:border-teal-500 hover:text-teal-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {appointmentCalendarDays.map((day, index) => {
                if (!day)
                  return (
                    <span key={`empty-${index}`} className="aspect-square" />
                  );
                const key = dateKey(day);
                const available = availableDates.includes(key);
                const selected = selectedDate === key;
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={!available}
                    onClick={() => setSelectedDate(key)}
                    className={`relative aspect-square rounded-lg text-xs transition ${
                      selected
                        ? "bg-teal-400 font-bold text-slate-950 shadow-lg shadow-teal-500/20"
                        : available
                          ? "bg-slate-800 text-slate-100 hover:bg-teal-950 hover:text-teal-300"
                          : "cursor-not-allowed text-slate-700"
                    }`}
                  >
                    {day.getDate()}
                    {available && !selected && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-teal-400" />
                    )}
                  </button>
                );
              })}
            </div>
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
            className="p-6 bg-slate-900 border border-teal-500/40 rounded-2xl flex flex-col items-stretch gap-6 shadow-2xl"
          >
            <div className="border-b border-slate-800 pb-4">
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

            <div className="w-full space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Patient details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Please provide the information the clinic needs for your
                  appointment.
                </p>
              </div>
              <label className="space-y-2 text-xs font-semibold text-slate-300">
                <span>
                  Email address{" "}
                  <span className="text-red-400" aria-hidden="true">
                    *
                  </span>
                </span>
                <input
                  required
                  type="email"
                  value={patientDetails.email}
                  onChange={(event) => {
                    setPatientDetails({
                      ...patientDetails,
                      email: event.target.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-500"
                />
                <span className="block text-[11px] font-normal text-slate-500">
                  Appointment notifications will be sent to this email.
                </span>
                {fieldErrors.email && (
                  <span className="block text-xs font-normal text-red-400">
                    {fieldErrors.email}
                  </span>
                )}
              </label>
              <label className="space-y-2 text-xs font-semibold text-slate-300">
                <span>
                  Phone number{" "}
                  <span className="text-red-400" aria-hidden="true">
                    *
                  </span>
                </span>
                <input
                  required
                  type="tel"
                  placeholder="e.g. +234 801 234 5678"
                  value={patientDetails.phone}
                  onChange={(event) => {
                    setPatientDetails({
                      ...patientDetails,
                      phone: event.target.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      phone: undefined,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-500"
                />
                {fieldErrors.phone && (
                  <span className="block text-xs font-normal text-red-400">
                    {fieldErrors.phone}
                  </span>
                )}
              </label>
              <div className="relative space-y-2 text-xs font-semibold text-slate-300">
                <span>
                  Date of birth{" "}
                  <span className="text-red-400" aria-hidden="true">
                    *
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setDobPickerOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-left text-sm font-normal text-slate-100 outline-none hover:border-teal-500"
                >
                  <span
                    className={
                      patientDetails.dateOfBirth
                        ? "text-slate-100"
                        : "text-slate-600"
                    }
                  >
                    {patientDetails.dateOfBirth
                      ? dateFromKey(
                          patientDetails.dateOfBirth,
                        ).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Choose your birth date"}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-teal-400" />
                </button>
                {dobPickerOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-full max-w-[250px] rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                    <div className="flex items-center justify-between gap-2 pb-3">
                      <button
                        type="button"
                        aria-label="Previous birth month"
                        onClick={() => changeMonth(dobMonth, setDobMonth, -1)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-teal-300"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex min-w-0 gap-2">
                        <select
                          aria-label="Birth month"
                          value={dobMonth.getMonth()}
                          onChange={(event) =>
                            setDobMonth(
                              new Date(
                                dobMonth.getFullYear(),
                                Number(event.target.value),
                                1,
                              ),
                            )
                          }
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-slate-100 outline-none focus:border-teal-500"
                        >
                          {monthNames.map((month, index) => (
                            <option
                              key={month}
                              value={index}
                              disabled={
                                dobMonth.getFullYear() ===
                                  today.getFullYear() &&
                                index > today.getMonth()
                              }
                            >
                              {month}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="Birth year"
                          value={dobMonth.getFullYear()}
                          onChange={(event) =>
                            setDobMonth(
                              new Date(
                                Number(event.target.value),
                                dobMonth.getMonth(),
                                1,
                              ),
                            )
                          }
                          className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-slate-100 outline-none focus:border-teal-500"
                        >
                          {birthYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        aria-label="Next birth month"
                        disabled={
                          dobMonth.getFullYear() === today.getFullYear() &&
                          dobMonth.getMonth() === today.getMonth()
                        }
                        onClick={() => changeMonth(dobMonth, setDobMonth, 1)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-teal-300 disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase text-slate-600">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                        <span key={`${day}-${index}`}>{day}</span>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {dobCalendarDays.map((day, index) => {
                        if (!day)
                          return (
                            <span
                              key={`dob-empty-${index}`}
                              className="aspect-square"
                            />
                          );
                        const key = dateKey(day);
                        const future = key > todayKey;
                        const selected = patientDetails.dateOfBirth === key;
                        return (
                          <button
                            type="button"
                            key={key}
                            disabled={future}
                            onClick={() => {
                              setPatientDetails({
                                ...patientDetails,
                                dateOfBirth: key,
                              });
                              setFieldErrors((current) => ({
                                ...current,
                                dateOfBirth: undefined,
                              }));
                              setDobPickerOpen(false);
                            }}
                            className={`aspect-square rounded-lg text-xs ${selected ? "bg-teal-400 font-bold text-slate-950" : future ? "text-slate-700" : "text-slate-300 hover:bg-slate-800 hover:text-teal-300"}`}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {fieldErrors.dateOfBirth && (
                  <span className="block text-xs font-normal text-red-400">
                    {fieldErrors.dateOfBirth}
                  </span>
                )}
              </div>
              <label className="space-y-2 text-xs font-semibold text-slate-300">
                <span>
                  Reason for visit{" "}
                  <span className="text-red-400" aria-hidden="true">
                    *
                  </span>
                </span>
                <input
                  required
                  type="text"
                  placeholder="What would you like help with?"
                  value={patientDetails.reason}
                  onChange={(event) => {
                    setPatientDetails({
                      ...patientDetails,
                      reason: event.target.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      reason: undefined,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-500"
                />
                {fieldErrors.reason && (
                  <span className="block text-xs font-normal text-red-400">
                    {fieldErrors.reason}
                  </span>
                )}
              </label>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={confirming}
              className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 font-semibold text-slate-950 rounded-xl hover:brightness-110 flex items-center justify-center gap-2"
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

      <AnimatePresence>
        {pendingSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="switch-slot-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <h2
                id="switch-slot-title"
                className="text-xl font-bold text-slate-100"
              >
                Switch appointment time?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                You already hold a time slot. Switching will release your
                current hold and reserve the newly selected time instead.
              </p>
              <div className="mt-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Current hold</span>
                  <span className="font-semibold text-slate-200">
                    {selectedSlot &&
                      new Date(selectedSlot.startTime).toLocaleString([], {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">New time</span>
                  <span className="font-semibold text-teal-300">
                    {new Date(pendingSlot.startTime).toLocaleString([], {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPendingSlot(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500"
                >
                  Keep current time
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextSlot = pendingSlot;
                    setPendingSlot(null);
                    void holdSlot(nextSlot);
                  }}
                  disabled={holding}
                  className="rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {holding ? "Switching..." : "Switch time slot"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-message-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h2
                id="booking-message-title"
                className="text-lg font-bold text-slate-100"
              >
                {modal.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {modal.message}
              </p>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="mt-6 w-full rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-300"
              >
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
