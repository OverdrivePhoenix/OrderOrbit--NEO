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

    const { cart } = await req.json(); // cart is an array of { id, quantity }
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Generate a unique UPI payment session reference
    tempSessionRef = `upi_sess_${Math.random().toString(36).substring(2, 9)}`;

    // 2. ATOMIC TRANSACTION: Check stock and reserve servings immediately
    // If stock is insufficient, this throws an error with detailed messages
    let pendingOrder;
    try {
      pendingOrder = await Database.reserveStock(cart, user.id, tempSessionRef);
    } catch (stockError: any) {
      return NextResponse.json({ error: stockError.message }, { status: 400 });
    }

    // 3. Return local UPI payment screen URL
    return NextResponse.json({ url: `/checkout-upi?session_id=${tempSessionRef}` });
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
