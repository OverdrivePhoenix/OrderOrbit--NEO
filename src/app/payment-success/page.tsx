"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Order } from "@/data/db";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Missing Stripe Session ID");
      setLoading(false);
      return;
    }

    const confirmPayment = async () => {
      try {
        const res = await fetch(`/api/checkout/details?session_id=${sessionId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to load order details");
        }

        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || "Something went wrong confirming your payment.");
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-xl font-bold">Verifying Payment...</h2>
        <p className="text-on-surface-variant text-sm">Please do not close this window or click back.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-4 max-w-sm mx-auto">
        <span className="material-symbols-outlined text-tertiary text-6xl">error</span>
        <h2 className="text-xl font-extrabold text-on-surface">Payment Verification Failed</h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">{error}</p>
        <Link
          href="/menu"
          className="inline-block bg-primary hover:bg-surface-tint text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-sm transition-all"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <span className="material-symbols-outlined text-secondary text-7xl font-fill animate-bounce">
        check_circle
      </span>
      <div>
        <h2 className="text-2xl font-extrabold text-on-surface">Payment Successful!</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Your order has been sent to the kitchen for preparation.
        </p>
      </div>

      <div className="bg-surface-container/30 border border-outline-variant/30 rounded-2xl p-6 shadow-inner space-y-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
            Your Pickup Token
          </span>
          <div className="text-4xl font-black text-primary mt-1 tracking-tight">
            {order?.token || "#T-PENDING"}
          </div>
        </div>

        <div className="border-t border-outline-variant/20 pt-4 flex justify-between text-left text-xs font-semibold text-on-surface-variant">
          <div>
            <p>Estimated wait: <span className="font-bold text-on-surface">~{order?.items.reduce((max, i) => Math.max(max, 10), 0) || 10} min</span></p>
            <p className="mt-1">Items: <span className="font-bold text-on-surface">{order?.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}</span></p>
          </div>
          <div className="text-right">
            <p>Total Paid</p>
            <p className="text-base font-extrabold text-[#006a62] mt-0.5">₹{((order?.total || 0) / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <Link
          href="/menu"
          className="bg-[#edf4ff] hover:bg-[#e3efff] text-on-surface font-semibold px-6 py-3 rounded-xl border border-outline-variant/30 text-sm transition-colors"
        >
          Monitor Order Queue
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f9ff]">
      <main className="w-full max-w-md bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_rgba(7,29,46,0.06)] flex flex-col items-center">
        <Suspense
          fallback={
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h2 className="text-xl font-bold">Loading session...</h2>
            </div>
          }
        >
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
