"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInstitutionalLogin = async () => {
    setLoading(true);
    setError("");

    // Use default credentials matching seed data for easy one-click testing
    const email = role === "student" ? "student@college.edu" : "admin@college.edu";
    const password = "password";

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect depending on role
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/menu");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    // Guest acts as standard student
    setRole("student");
    await handleInstitutionalLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-[#071d2e] relative overflow-hidden bg-[#f7f9ff]">
      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#ff6b35]/20 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#70f8e8]/20 blur-[80px]"></div>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(7,29,46,0.08)] p-8 md:p-10 flex flex-col items-center">
          {/* Logo Section */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full shadow-md bg-white p-2 flex items-center justify-center mb-4 border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-5xl font-fill">restaurant_menu</span>
            </div>
            <h1 className="font-extrabold text-3xl text-primary tracking-tight">OrderOrbit</h1>
            <p className="text-on-surface-variant text-sm mt-2">Your campus dining, streamlined.</p>
          </div>

          {/* Role Selector */}
          <div className="w-full bg-[#e3efff] rounded-xl p-1 flex mb-8 border border-outline-variant/10">
            <button
              onClick={() => setRole("student")}
              aria-selected={role === "student"}
              className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${
                role === "student"
                  ? "bg-white shadow-sm text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setRole("admin")}
              aria-selected={role === "admin"}
              className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all ${
                role === "admin"
                  ? "bg-white shadow-sm text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Staff / Admin
            </button>
          </div>

          {error && (
            <div className="w-full p-3 mb-4 rounded-xl bg-tertiary-container/20 border border-tertiary-container text-tertiary text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {/* Login Actions */}
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={handleInstitutionalLogin}
              disabled={loading}
              className="w-full bg-primary hover:bg-surface-tint text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">school</span>
              {loading ? "Verifying..." : "Sign in with institutional credentials"}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-outline-variant/30"></div>
              <span className="flex-shrink-0 mx-4 text-on-surface-variant text-xs font-semibold">or</span>
              <div className="flex-grow border-t border-outline-variant/30"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full bg-[#edf4ff] hover:bg-[#e3efff] text-on-surface font-semibold h-12 rounded-xl flex items-center justify-center gap-2 border border-outline-variant/40 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              Guest Access
            </button>
          </div>

          {/* Info Footer */}
          <div className="mt-8 text-center text-xs text-on-surface-variant">
            <p>Demo accounts (one-click login):</p>
            <p className="mt-1 font-mono">
              Student: student@college.edu | Admin: admin@college.edu
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
