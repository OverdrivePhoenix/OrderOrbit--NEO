import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

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

    if (paymentMethod === "wallet") {
      // ATOMIC TRANSACTION: Check stock, check wallet, deduct wallet balance, and confirm order
      try {
        await Database.payWithWallet(cart, user.id, tempSessionRef);
        return NextResponse.json({ url: `/payment-success?session_id=${tempSessionRef}` });
      } catch (walletError: any) {
        return NextResponse.json({ error: walletError.message }, { status: 400 });
      }
    } else {
      // Normal UPI QR Flow: ATOMIC TRANSACTION: Check stock and reserve servings
      try {
        await Database.reserveStock(cart, user.id, tempSessionRef);
        return NextResponse.json({ url: `/checkout-upi?session_id=${tempSessionRef}` });
      } catch (stockError: any) {
        return NextResponse.json({ error: stockError.message }, { status: 400 });
      }
    }
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
