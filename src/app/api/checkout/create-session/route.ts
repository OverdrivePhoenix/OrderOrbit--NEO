import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser, signOrders, verifyOrders } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  let tempSessionRef = "";
  try {
    // 1. Authenticate user
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
    }

    const { cart, paymentMethod } = await req.json(); // cart is an array of { id, quantity, version }
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Generate a unique payment session reference
    tempSessionRef = `${paymentMethod === "wallet" ? "wallet" : "upi"}_sess_${Math.random().toString(36).substring(2, 9)}`;

    let pendingOrder;
    if (paymentMethod === "wallet") {
      // ATOMIC TRANSACTION: Check stock, check wallet, deduct wallet balance, and confirm order
      try {
        pendingOrder = await Database.payWithWallet(cart, user.id, tempSessionRef);
      } catch (walletError: any) {
        return NextResponse.json({ error: walletError.message }, { status: 400 });
      }
    } else {
      // Normal UPI QR Flow: ATOMIC TRANSACTION: Check stock and reserve servings
      try {
        pendingOrder = await Database.reserveStock(cart, user.id, tempSessionRef);
      } catch (stockError: any) {
        return NextResponse.json({ error: stockError.message }, { status: 400 });
      }
    }

    // Save to cookies to support Vercel serverless persistence
    const cookieStore = await cookies();
    const ordersToken = cookieStore.get("orbit_orders")?.value;
    const cookieOrders = ordersToken ? await verifyOrders(ordersToken) : [];
    // Keep only last 10 orders to prevent cookie size overflow
    const updatedCookieOrders = [pendingOrder, ...cookieOrders].slice(0, 10);
    const newToken = await signOrders(updatedCookieOrders);

    const redirectUrl = paymentMethod === "wallet"
      ? `/payment-success?session_id=${tempSessionRef}`
      : `/checkout-upi?session_id=${tempSessionRef}`;

    const response = NextResponse.json({ url: redirectUrl });
    response.cookies.set("orbit_orders", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Session Creation Failed:", error);

    // Rollback stock reservation if we hit any server error
    if (tempSessionRef) {
      try {
        await Database.releaseReservedStock(tempSessionRef);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: error.message || "Failed to initiate payment. Please try again." },
      { status: 500 }
    );
  }
}
