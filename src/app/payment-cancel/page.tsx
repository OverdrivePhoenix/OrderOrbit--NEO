"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CancelContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [releasing, setReleasing] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setReleasing(false);
      return;
    }

    const cancelSession = async () => {
      try {
        await fetch(`/api/checkout/cancel?session_id=${sessionId}`);
      } catch (err) {
        console.error("Error releasing reserved stock:", err);
      } finally {
        setReleasing(false);
      }
    };

    cancelSession();
  }, [sessionId]);

  return (
    <div className="text-center space-y-6 max-w-sm mx-auto">
      <span className="material-symbols-outlined text-tertiary text-7xl">
        cancel
      </span>
      <div>
        <h2 className="text-2xl font-extrabold text-on-surface">Payment Cancelled</h2>
        <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
          {releasing
            ? "Releasing your reserved snack servings back to stock..."
            : "Your reserved items have been released. No charges were made. Feel free to adjust your basket and try again!"}
        </p>
      </div>

      <Link
        href="/menu"
        className="inline-block w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm transition-all active:scale-95"
      >
        Return to Menu
      </Link>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f9ff]">
      <main className="w-full max-w-md bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_rgba(7,29,46,0.06)] flex flex-col items-center">
        <Suspense
          fallback={
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h2 className="text-xl font-bold">Processing cancellation...</h2>
            </div>
          }
        >
          <CancelContent />
        </Suspense>
      </main>
    </div>
  );
}
