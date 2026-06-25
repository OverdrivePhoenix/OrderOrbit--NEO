"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "staff" | "admin">("student");
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
        if (res.status === 403 && data.code === "ACCOUNT_PENDING") {
          router.push("/pending-approval");
          return;
        }
        if (res.status === 403 && data.code === "ACCOUNT_APPROVED") {
          router.push(`/activate?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      // Redirect depending on user's role returned by API
      if (data.user.role === "admin") {
        router.push("/admin");
      } else if (data.user.role === "staff") {
        router.push("/kitchen");
      } else {
        router.push("/menu");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };




  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-foreground relative overflow-hidden bg-background">
      {/* Theme Toggle Positioned in top-right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#ff6b35]/20 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#70f8e8]/20 blur-[80px]"></div>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-md px-6 my-8">
        <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border shadow-[0_8px_32px_rgba(7,29,46,0.08)] p-8 md:p-10 flex flex-col items-center">
          {/* Logo Section */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full shadow-md bg-card p-2 flex items-center justify-center mb-3 border border-border">
              <span className="material-symbols-outlined text-primary text-4xl font-fill">restaurant_menu</span>
            </div>
            <h1 className="font-extrabold text-2xl text-primary tracking-tight">OrderOrbit</h1>
            <p className="text-muted-foreground text-xs mt-1">Your campus dining, streamlined.</p>
          </div>

          {/* Role Selector */}
          <div className="w-full bg-muted rounded-xl p-1 flex mb-6 border border-border">
            <button
              onClick={() => setRole("student")}
              aria-selected={role === "student"}
              className={`flex-1 py-2.5 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                role === "student"
                  ? "bg-card shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setRole("staff")}
              aria-selected={role === "staff"}
              className={`flex-1 py-2.5 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                role === "staff"
                  ? "bg-card shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kitchen Staff
            </button>
            <button
              onClick={() => setRole("admin")}
              aria-selected={role === "admin"}
              className={`flex-1 py-2.5 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                role === "admin"
                  ? "bg-card shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Admin
            </button>
          </div>

          {error && (
            <div className="w-full p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center leading-tight">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Institutional Email
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder={
                    role === "student"
                      ? "student@college.edu"
                      : role === "staff"
                      ? "staff@college.edu"
                      : "admin@college.edu"
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors text-lg">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm shadow-sm transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 disabled:opacity-50 mt-6 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              {loading ? "Verifying..." : `Sign In as ${role === "student" ? "Student" : role === "staff" ? "Staff" : "Admin"}`}
            </button>
          </form>



          <div className="flex flex-col gap-2 mt-6 text-center w-full border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Need an account?{" "}
              <button
                onClick={() => router.push("/register")}
                className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-none"
              >
                Register
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Received activation token?{" "}
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
