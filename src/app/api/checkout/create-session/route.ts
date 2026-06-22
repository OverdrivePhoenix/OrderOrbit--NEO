import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

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

    // Generate a temporary session reference
    tempSessionRef = `temp_stripe_${Math.random().toString(36).substring(2, 9)}`;

    // 2. ATOMIC TRANSACTION: Reserve stock in DB
    // If stock is insufficient, this throws an error with a details message
    let pendingOrder;
    try {
      pendingOrder = await Database.reserveStock(cart, user.id, tempSessionRef);
    } catch (stockError: any) {
      return NextResponse.json({ error: stockError.message }, { status: 400 });
    }

    // 3. Map items to Stripe Line Items
    const lineItems = pendingOrder.items.map((item) => {
      // price is in cents in db
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      };
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment-cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: user.id,
        tempSessionRef: tempSessionRef,
      },
    });

    // 5. Update Order in DB to bind the actual Stripe Session ID
    await Database.write((db) => {
      const order = db.orders.find((o) => o.sessionId === tempSessionRef);
      if (order) {
        order.sessionId = session.id;
      }
    });

    // 6. Return Stripe checkout session URL
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Session Creation Failed:", error);

    // Rollback stock reservation if we hit any Stripe error
    if (tempSessionRef) {
      try {
        await Database.releaseReservedStock(tempSessionRef);
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    return NextResponse.json(
      { error: error.message || "Failed to initiate payment session. Please try again." },
      { status: 500 }
    );
  }
}
