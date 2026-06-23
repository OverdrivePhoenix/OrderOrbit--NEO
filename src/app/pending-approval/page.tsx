"use client";

import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center font-sans text-[#071d2e] relative overflow-hidden bg-[#f7f9ff]">
      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#ff6b35]/20 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#70f8e8]/20 blur-[80px]"></div>
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 w-full max-w-md px-6 my-8">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(7,29,46,0.08)] p-8 md:p-10 flex flex-col items-center text-center">
          {/* Animated Status Icon */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-amber-500 text-4xl font-fill">pending_actions</span>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold animate-bounce">
              !
            </div>
          </div>

          <h1 className="font-extrabold text-2xl text-primary tracking-tight mb-2">Registration Pending</h1>
          <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
            Your registration is currently pending admin review. A cafeteria manager or admin must approve your request.
          </p>

          <div className="w-full bg-[#f0f4fa] rounded-xl p-4 mb-6 border border-outline-variant/20 text-left space-y-2.5 text-xs text-on-surface-variant leading-relaxed">
            <div className="flex gap-2">
              <span className="material-symbols-outlined text-primary text-base">info</span>
              <p>
                <strong>What happens next?</strong> After approval, a unique activation token (e.g. <code className="bg-white px-1.5 py-0.5 rounded border text-primary">ACTIV-XXXX</code>) is generated.
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
              className="w-full bg-primary hover:bg-surface-tint text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">vpn_key</span>
              Activate Approved Account
            </button>

            <button
              onClick={() => router.push("/login")}
              className="w-full bg-white hover:bg-surface-container-low text-on-surface font-semibold h-12 rounded-xl flex items-center justify-center gap-2 border border-outline-variant/40 transition-colors"
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
