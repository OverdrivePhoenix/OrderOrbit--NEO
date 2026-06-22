"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Order } from "@/data/db";
import Link from "next/link";

function UpiCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // AI states
  const [scanning, setScanning] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [manualVerificationSubmitting, setManualVerificationSubmitting] = useState(false);

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
        setError(err.message || "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetails();
  }, [sessionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setOcrError("");
    }
  };

  const handleVerifyWithAI = async () => {
    if (!file || !sessionId) return;
    setScanning(true);
    setOcrError("");

    try {
      // 1. Convert file to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        // 2. Call backend verify-screenshot endpoint
        try {
          const res = await fetch("/api/checkout/verify-screenshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              screenshot: base64Data,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "Failed to verify screenshot");
          }

          if (data.verified) {
            setOcrSuccess(true);
            setConfirmedOrder(data.order);
          } else {
            // AI could not verify automatically (amount/UTR mismatch or OCR fail)
            // But the backend automatically queued it as "Pending Verification"
            setOcrError(data.error || "AI could not verify receipt automatically.");
            setConfirmedOrder(data.order); // Contains the UTR-loaded manual check order
          }
        } catch (err: any) {
          setOcrError(err.message || "AI Verification failed. Please try again.");
        } finally {
          setScanning(false);
        }
      };
    } catch (err: any) {
      setOcrError("Failed to parse image file.");
      setScanning(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/checkout/cancel?session_id=${sessionId}`);
      router.push("/menu");
    } catch (e) {
      console.error("Cancel failed", e);
    }
  };

  if (loading) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold">Initiating UPI pre-order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-4 max-w-sm mx-auto py-8">
        <span className="material-symbols-outlined text-rose-500 text-6xl">error</span>
        <h2 className="text-xl font-extrabold text-on-surface">Payment Error</h2>
        <p className="text-on-surface-variant text-sm leading-relaxed">{error}</p>
        <button
          onClick={() => router.push("/menu")}
          className="w-full bg-primary hover:bg-surface-tint text-white font-bold py-3 rounded-xl transition-all"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const orderTotalInRupees = (order?.total || 0) / 100;
  // Generate UPI Deep Link URL: pa = payee address, pn = payee name, am = amount, tn = transaction note (orderID)
  const upiPayee = "canteen@upi";
  const upiName = "OrderOrbit College Canteen";
  const upiLink = `upi://pay?pa=${upiPayee}&pn=${encodeURIComponent(upiName)}&am=${orderTotalInRupees.toFixed(2)}&tn=${order?.id}&cu=INR`;
  // Generate QR Code URL using QR Server public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

  // SUCCESS Screen: AI Auto-Approved Payment
  if (ocrSuccess && confirmedOrder) {
    return (
      <div className="text-center space-y-6">
        <span className="material-symbols-outlined text-secondary text-7xl font-fill animate-bounce">
          check_circle
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface">AI Auto-Approved!</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Gemini AI verified your screenshot payment amount. Order sent to the kitchen.
          </p>
        </div>

        <div className="bg-surface-container/30 border border-outline-variant/30 rounded-2xl p-6 shadow-inner space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
              Pickup Token Code
            </span>
            <div className="text-4xl font-black text-primary mt-1 tracking-tight">
              {confirmedOrder.token}
            </div>
          </div>
          <div className="border-t border-outline-variant/20 pt-4 flex justify-between text-left text-xs font-semibold text-on-surface-variant">
            <div>
              <p>UTR Number: <span className="font-bold text-on-surface">{confirmedOrder.utr}</span></p>
              <p className="mt-1">Verified By: <span className="font-bold text-secondary">Gemini Multimodal AI</span></p>
            </div>
            <div className="text-right">
              <p>Total Paid</p>
              <p className="text-base font-extrabold text-[#006a62] mt-0.5">₹{orderTotalInRupees.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <Link
          href="/menu"
          className="inline-block w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm transition-all"
        >
          Return to Menu & Track
        </Link>
      </div>
    );
  }

  // FALLBACK Screen: AI verification failed, order queued for Manual Admin Verification
  if (ocrError && confirmedOrder) {
    return (
      <div className="text-center space-y-6">
        <span className="material-symbols-outlined text-amber-500 text-7xl animate-pulse">
          pending_actions
        </span>
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface">Verification Pending</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            AI couldn't auto-match. Order submitted for manual verification.
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-left text-xs leading-relaxed space-y-2">
          <p className="text-amber-800 font-bold">⚠️ Scan Verification Note:</p>
          <p className="text-amber-700 font-semibold">{ocrError}</p>
          <p className="text-on-surface-variant">
            Don't worry! Your order has been submitted to the canteen manager. They will verify your UTR code manually. Check your Orders list on the Menu to monitor verification.
          </p>
        </div>

        <div className="bg-surface-container/30 border border-outline-variant/30 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-on-surface-variant">Session Reference</span>
            <span className="font-mono text-on-surface">{confirmedOrder.sessionId}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-on-surface-variant">UTR Submitted</span>
            <span className="font-mono text-on-surface">{confirmedOrder.utr}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-on-surface-variant">Total Amount</span>
            <span className="text-[#006a62] font-bold">₹{orderTotalInRupees.toFixed(2)}</span>
          </div>
        </div>

        <Link
          href="/menu"
          className="inline-block w-full bg-primary hover:bg-surface-tint text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm transition-all"
        >
          Return to Menu & Track
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 relative">
      {/* Scanning Scanner Animation Overlay */}
      {scanning && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="relative w-24 h-24 border-4 border-primary/20 rounded-2xl flex items-center justify-center overflow-hidden">
            {/* Pulsing Scanner line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-bounce shadow-md"></div>
            <span className="material-symbols-outlined text-primary text-5xl font-fill animate-pulse">image</span>
          </div>
          <h3 className="font-extrabold text-lg mt-6">Scanning Payment Receipt</h3>
          <p className="text-on-surface-variant text-xs mt-2 max-w-xs leading-relaxed">
            Gemini Multimodal AI is extracting the transaction UTR code, receiver name, and amount details...
          </p>
        </div>
      )}

      {/* Main Payment Details Form */}
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-center bg-[#edf4ff] border border-outline-variant/20 p-4 rounded-2xl">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">Pre-Order Total</p>
            <p className="text-2xl font-black text-[#006a62] mt-0.5">₹{orderTotalInRupees.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">Estimated Wait</p>
            <p className="font-bold text-on-surface mt-0.5">~{order?.items.reduce((max, i) => Math.max(max, 10), 0) || 10} min</p>
          </div>
        </div>

        {/* UPI ID Info */}
        <div className="text-xs font-semibold text-on-surface-variant text-center bg-gray-50 border border-outline-variant/20 p-3 rounded-xl flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-primary">account_balance_wallet</span>
          Pay To Canteen UPI: <span className="font-extrabold text-on-surface">{upiPayee}</span>
        </div>

        {/* QR Code Container */}
        <div className="bg-white border border-outline-variant/20 rounded-2xl p-6 flex flex-col items-center shadow-sm">
          <img
            src={qrCodeUrl}
            alt="UPI QR Code"
            className="w-52 h-52 object-contain border border-outline-variant/10 rounded-xl"
          />
          <p className="text-[10px] text-on-surface-variant font-bold mt-4 tracking-wide text-center">
            SCAN QR WITH GOOGLE PAY, PHONEPE, OR PAYTM TO PAY
          </p>
        </div>

        {/* File Uploader */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold text-on-surface">
            Step 2: Upload Payment Confirmation Screenshot
          </label>
          
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/40 rounded-2xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors relative cursor-pointer group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            {previewUrl ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-outline-variant/20 bg-white flex items-center justify-center">
                <img src={previewUrl} alt="Receipt preview" className="h-full object-contain" />
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <span className="material-symbols-outlined text-gray-400 text-3xl group-hover:scale-110 transition-transform">
                  add_photo_alternate
                </span>
                <p className="text-xs font-semibold text-on-surface-variant">
                  Click to upload screenshot
                </p>
                <p className="text-[10px] text-gray-400">JPEG, PNG receipt images</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification Trigger Button */}
        <button
          onClick={handleVerifyWithAI}
          disabled={!file || scanning}
          className={`w-full font-extrabold py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 ${
            file
              ? "bg-[#6366f1] hover:bg-[#4f46e5] text-white"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">psychology</span>
          Verify & Auto-Approve with Gemini AI
        </button>

        <button
          onClick={handleCancelOrder}
          className="w-full bg-white hover:bg-gray-50 text-on-surface-variant font-semibold py-3 rounded-xl border border-outline-variant/30 text-sm transition-colors active:scale-95"
        >
          Cancel Order
        </button>
      </div>
    </div>
  );
}

export default function UpiCheckoutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f9ff]">
      <main className="w-full max-w-md bg-white/80 backdrop-blur-md border border-white/50 rounded-3xl p-6 md:p-8 shadow-[0_8px_32px_rgba(7,29,46,0.06)] flex flex-col items-center">
        <div className="mb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-primary text-2xl">qr_code_2</span>
          </div>
          <h2 className="font-extrabold text-xl text-on-surface tracking-tight">UPI Payment Gateway</h2>
        </div>

        <Suspense
          fallback={
            <div className="text-center space-y-4 py-8">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold">Loading checkout portal...</p>
            </div>
          }
        >
          <UpiCheckoutContent />
        </Suspense>
      </main>
    </div>
  );
}
