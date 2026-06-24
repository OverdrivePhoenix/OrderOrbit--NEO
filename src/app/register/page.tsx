"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

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

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (isResend = false) => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setOtpLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }
      setOtpSent(true);
      setOtp("");
      setSuccessMsg(
        isResend
          ? `A new code has been sent to ${email}.`
          : `Verification code sent to ${email}. Check your inbox and spam folder.`
      );
      startCooldown();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !role || !department || !otp) {
      setError("Please fill in all required fields and enter the verification code.");
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
          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccessMsg(data.message || "Registration successful! Pending admin approval.");

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
    <div className="min-h-screen flex items-center justify-center font-sans text-foreground relative overflow-hidden bg-background">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#ff6b35]/20 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#70f8e8]/20 blur-[80px]"></div>
      </div>

      <main className="relative z-10 w-full max-w-md px-6 my-8">
        <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border shadow-[0_8px_32px_rgba(7,29,46,0.08)] p-8 md:p-10 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full shadow-md bg-card p-2 flex items-center justify-center mb-3 border border-border">
              <span className="material-symbols-outlined text-primary text-4xl font-fill">how_to_reg</span>
            </div>
            <h1 className="font-extrabold text-2xl text-primary tracking-tight">Create Account</h1>
            <p className="text-muted-foreground text-xs mt-1">Submit registration for admin approval.</p>
          </div>

          {error && (
            <div className="w-full p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center leading-tight">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="w-full p-3 mb-4 rounded-xl bg-green-50/20 border border-green-500/30 text-green-400 text-xs font-semibold text-center leading-tight">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="w-full space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                  person
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email + Send OTP button */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Email Address
              </label>
              <div className="flex gap-2">
                <div className="relative group flex-grow">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    disabled={otpSent}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all disabled:opacity-70"
                    placeholder="yourname@gmail.com"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSendOtp(false)}
                  disabled={otpLoading || !email || otpSent}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shrink-0"
                >
                  {otpLoading ? "Sending…" : otpSent ? "✓ Sent" : "Send OTP"}
                </button>
              </div>
            </div>

            {/* OTP Input — shown after email is sent */}
            {otpSent && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Verification Code
                </label>

                {/* "Check your inbox" notice */}
                <div className="w-full px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400 text-xl shrink-0 mt-0.5">mark_email_read</span>
                  <div>
                    <p className="text-xs font-semibold text-blue-300">Code sent to <span className="text-white">{email}</span></p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Check your inbox and spam folder. Expires in 5 minutes.</p>
                  </div>
                </div>

                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                    key
                  </span>
                  <input
                    type="text"
                    required
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all font-mono font-bold tracking-widest text-center"
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => handleSendOtp(true)}
                    disabled={otpLoading || resendCooldown > 0}
                    className="text-xs text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : otpLoading ? "Sending…" : "Didn't receive it? Resend"}
                  </button>
                </div>
              </div>
            )}

            {/* Account Role */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Account Role
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                  badge
                </span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all appearance-none"
                >
                  <option value="student">Student</option>
                  <option value="staff">Kitchen Staff</option>
                  <option value="admin">Admin Manager</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  arrow_drop_down
                </span>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Department / Section
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                  domain
                </span>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder={role === "student" ? "Computer Science" : "Main Canteen"}
                />
              </div>
            </div>

            {/* Student ID */}
            {role === "student" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Student ID / Roll Number
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                    pin
                  </span>
                  <input
                    type="text"
                    required={role === "student"}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                    placeholder="BTech/CS/2024/042"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !otpSent}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50 mt-6 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
              {loading ? "Submitting…" : "Submit Registration"}
            </button>
          </form>

          <div className="flex flex-col gap-2 mt-6 text-center w-full border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Already have an active account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-none"
              >
                Sign In
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Need to activate approved account?{" "}
              <button
                onClick={() => router.push("/activate")}
                className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-none"
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
