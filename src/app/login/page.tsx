"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Clear inputs when role changes to avoid confusion
  useEffect(() => {
    setEmail("");
    setPassword("");
    setError("");
  }, [role]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

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

      // Redirect depending on user's role returned by API
      if (data.user.role === "admin") {
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

  const handleFillDemo = () => {
    if (role === "student") {
      setEmail("student@college.edu");
      setPassword("password");
    } else {
      setEmail("admin@college.edu");
      setPassword("password");
    }
    setError("");
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@college.edu", password: "password" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/menu");
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
              <span className="material-symbols-outlined text-primary text-4xl font-fill">restaurant_menu</span>
            </div>
            <h1 className="font-extrabold text-2xl text-primary tracking-tight">OrderOrbit</h1>
            <p className="text-on-surface-variant text-xs mt-1">Your campus dining, streamlined.</p>
          </div>

          {/* Role Selector */}
          <div className="w-full bg-[#e3efff] rounded-xl p-1 flex mb-6 border border-outline-variant/10">
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
            <div className="w-full p-3 mb-4 rounded-xl bg-tertiary-container/20 border border-tertiary-container text-tertiary text-xs font-semibold text-center leading-tight">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
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
                  placeholder={role === "student" ? "student@college.edu" : "admin@college.edu"}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-outline-variant/40 bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-primary text-xs font-bold hover:underline transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">bolt</span>
                Autofill demo credentials
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-surface-tint text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50 mt-6"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              {loading ? "Verifying..." : `Sign In as ${role === "student" ? "Student" : "Admin"}`}
            </button>
          </form>

          <div className="relative flex items-center py-2 w-full mt-2">
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
            Guest Access (Student Role)
          </button>
        </div>
      </main>
    </div>
  );
}
