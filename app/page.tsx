"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface Clinic {
  id: string;
  name: string;
  slug: string;
  address: string;
}

export default function LandingPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("jwt_token");

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/clinics`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClinics(data);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-8">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center py-4">
        <div className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          PulseBook
        </div>
        <div className="space-x-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700"
          >
            Sign In
          </Link>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 text-sm rounded-lg bg-teal-500 text-slate-950 font-semibold hover:bg-teal-400"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full my-auto text-center py-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4"
        >
          Multi-Clinic Medical Care, <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-blue-500 bg-clip-text text-transparent">
            Seamlessly Scheduled.
          </span>
        </motion.h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto">
          Select a healthcare facility below to explore available consultation
          slots with dynamic hold reservation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          {clinics.map((clinic) => (
            <motion.div
              key={clinic.id}
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-semibold text-slate-100">
                  {clinic.name}
                </h3>
                <p className="text-slate-400 text-sm mt-2">{clinic.address}</p>
              </div>
              <Link
                href={`/book/${clinic.id}`}
                className="mt-6 inline-block text-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 font-semibold text-slate-950 text-sm hover:brightness-110"
              >
                Book Appointment
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="text-center text-slate-600 text-xs py-4">
        Built by Nsikak Imeh-Essien
      </footer>
    </div>
  );
}
