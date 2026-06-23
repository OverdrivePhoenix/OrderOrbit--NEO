"use client";

import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function PendingApprovalPage() {
  const router = useRouter();

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
        <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.15)] p-8 md:p-10 flex flex-col items-center text-center">
          {/* Animated Status Icon */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-amber-500 text-4xl font-fill">pending_actions</span>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-card flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
              !
            </div>
          </div>

          <h1 className="font-extrabold text-2xl text-primary tracking-tight mb-2">Registration Pending</h1>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Your registration is currently pending admin review. A cafeteria manager or admin must approve your request.
          </p>

          <div className="w-full bg-muted/40 rounded-xl p-4 mb-6 border border-border text-left space-y-2.5 text-xs text-muted-foreground leading-relaxed">
            <div className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-base">info</span>
              <p>
                <strong>What happens next?</strong> After approval, a unique activation token (e.g. <code className="bg-muted px-1.5 py-0.5 rounded border border-border text-primary font-bold">ACTIV-XXXX</code>) is generated.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-base">share</span>
              <p>
                <strong>Get your token:</strong> Contact your canteen admin or check with department coordinators to receive your token.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-base">vpn_key</span>
              <p>
                <strong>Activate account:</strong> Click the button below to use your token and set your account password.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => router.push("/activate")}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">vpn_key</span>
              Activate Approved Account
            </button>

            <button
              onClick={() => router.push("/login")}
              className="w-full bg-card hover:bg-muted text-foreground font-semibold h-12 rounded-xl flex items-center justify-center gap-2 border border-border transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Back to Sign In
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
