"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "staff" | "admin">("student");
  const [department, setDepartment] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !role || !department) {
      setError("Please fill in all required fields.");
      return;
    }
    if (role === "student" && !studentId) {
      setError("Please fill in your Student ID.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          department,
          studentId: role === "student" ? studentId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccessMsg(data.message || "Registration successful! Pending admin approval.");
      
      // Auto redirect to pending-approval page after 3 seconds
      setTimeout(() => {
        router.push("/pending-approval");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-[#071d2e] relative overflow-hidden bg-[#f7f9ff]">
      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#ff6b35]/20 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#70f8e8]/20 blur-[80px]"></div>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-md px-6 my-8">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(7,29,46,0.08)] p-8 md:p-10 flex flex-col items-center">
          {/* Logo Section */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full shadow-md bg-white p-2 flex items-center justify-center mb-3 border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-4xl font-fill">how_to_reg</span>
            </div>
            <h1 className="font-extrabold text-2xl text-primary tracking-tight">Create Account</h1>
            <p className="text-on-surface-variant text-xs mt-1">Submit registration for admin approval.</p>
          </div>

          {error && (
            <div className="w-full p-3 mb-4 rounded-xl bg-tertiary-container/20 border border-tertiary-container text-tertiary text-xs font-semibold text-center leading-tight">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="w-full p-3 mb-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold text-center leading-tight">
              {successMsg}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegisterSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Full Name
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
                  person
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Institutional Email
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder="student@college.edu or staff@college.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Account Role
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
                  badge
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all appearance-none"
                >
                  <option value="student">Student</option>
                  <option value="staff">Kitchen Staff</option>
                  <option value="admin">Admin Manager</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                  arrow_drop_down
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Department / Section
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
                  domain
                </span>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder={role === "student" ? "Computer Science" : "Main Canteen"}
                />
              </div>
            </div>

            {role === "student" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Student ID / Roll Number
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
                    pin
                  </span>
                  <input
                    type="text"
                    required={role === "student"}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                    placeholder="BTech/CS/2024/042"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-surface-tint text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50 mt-6"
            >
              <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          </form>

          <div className="flex flex-col gap-2 mt-6 text-center w-full border-t border-outline-variant/10 pt-4">
            <p className="text-xs text-on-surface-variant">
              Already have an active account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-primary font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
            <p className="text-xs text-on-surface-variant">
              Need to activate approved account?{" "}
              <button
                onClick={() => router.push("/activate")}
                className="text-primary font-bold hover:underline"
              >
                Activate Account
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
