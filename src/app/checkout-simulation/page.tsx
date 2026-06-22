"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Order } from "@/data/db";

function SimulationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing Session ID in URL query parameters.");
      setLoading(false);
      return;
    }

    const loadOrderDetails = async () => {
      try {
        const res = await fetch(`/api/checkout/details?session_id=${sessionId}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Order not found");
        }
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || "Failed to load checkout details");
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [sessionId]);

  const handlePaySuccess = () => {
    setSubmitting(true);
    // Redirect directly to payment success page, which invokes the confirmation API
    router.push(`/payment-success?session_id=${sessionId}`);
  };

  const handlePayCancel = () => {
    setSubmitting(true);
    // Redirect directly to payment cancel page, which invokes the release stock API
    router.push(`/payment-cancel?session_id=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold">Initiating checkout simulation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-4 max-w-sm mx-auto py-8">
        <span className="material-symbols-outlined text-rose-500 text-6xl">error</span>
        <h2 className="text-xl font-extrabold text-on-surface">Simulation Error</h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">{error}</p>
        <button
          onClick={() => router.push("/menu")}
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold py-3 rounded-xl transition-all"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Simulation Banner Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex gap-3 text-amber-800">
        <span className="material-symbols-outlined text-amber-600 shrink-0">info</span>
        <div className="text-xs font-semibold leading-relaxed">
          <strong className="block text-sm font-bold mb-0.5">Stripe Simulation Active</strong>
          No active Stripe API key was found in the environment. This secure mock payment screen has been launched to allow testing of the FIFO stock checkout pipeline.
        </div>
      </div>

      {/* Cart Summary */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 text-left">
        <h3 className="font-extrabold text-base mb-3 text-on-surface border-b border-outline-variant/10 pb-2">
          Order Summary
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-4">
          {order?.items.map((i, index) => (
            <div key={index} className="flex justify-between text-xs font-semibold text-on-surface">
              <span>{i.quantity}x {i.name}</span>
              <span className="text-on-surface-variant">${((i.price * i.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-extrabold text-base border-t border-outline-variant/20 pt-3">
          <span>Amount Due</span>
          <span className="text-[#006a62]">${((order?.total || 0) / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Mock Credit Card Form */}
      <div className="bg-white border border-outline-variant/20 rounded-2xl p-5 text-left space-y-4 shadow-inner">
        <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-gray-400">credit_card</span>
          Mock Payment Details
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value="4242 4242 4242 4242"
                className="w-full rounded-xl border border-outline-variant/40 p-3 text-sm bg-gray-50 text-gray-500 font-mono focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Test Mode
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                disabled
                value="12 / 29"
                className="w-full rounded-xl border border-outline-variant/40 p-3 text-sm bg-gray-50 text-gray-500 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
                CVC
              </label>
              <input
                type="text"
                disabled
                value="123"
                className="w-full rounded-xl border border-outline-variant/40 p-3 text-sm bg-gray-50 text-gray-500 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handlePaySuccess}
          disabled={submitting}
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          Confirm Mock Payment (Success)
        </button>

        <button
          onClick={handlePayCancel}
          disabled={submitting}
          className="w-full bg-white hover:bg-gray-50 text-on-surface-variant font-semibold py-3 rounded-xl border border-outline-variant/30 text-sm transition-colors active:scale-95 disabled:opacity-50"
        >
          Cancel & Return
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSimulationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f9ff]">
      <main className="w-full max-w-md bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_rgba(7,29,46,0.06)] flex flex-col items-center">
        <div className="mb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#6366f1]/10 flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-[#6366f1] text-2xl">shopping_cart_checkout</span>
          </div>
          <h2 className="font-extrabold text-xl text-on-surface tracking-tight">OrderOrbit Checkout</h2>
        </div>

        <Suspense
          fallback={
            <div className="text-center space-y-4 py-8">
              <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold">Loading simulation content...</p>
            </div>
          }
        >
          <SimulationContent />
        </Suspense>
      </main>
    </div>
  );
}
