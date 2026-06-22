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

    // Determine if we need to run in Stripe Simulation Mode (for students without Stripe credentials)
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const runSimulation = 
      !stripeKey || 
      stripeKey.startsWith("sk_test_placeholder") || 
      stripeKey === "";

    // Generate a temporary session reference
    tempSessionRef = `${runSimulation ? "sim" : "temp"}_stripe_${Math.random().toString(36).substring(2, 9)}`;

    // 2. ATOMIC TRANSACTION: Reserve stock in DB
    let pendingOrder;
    try {
      pendingOrder = await Database.reserveStock(cart, user.id, tempSessionRef);
    } catch (stockError: any) {
      return NextResponse.json({ error: stockError.message }, { status: 400 });
    }

    // 3. If in Simulation Mode, skip Stripe API and redirect to the local mock payment screen
    if (runSimulation) {
      console.log("Stripe Simulation Mode active. Redirecting to local simulation portal.");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.json({ url: `/checkout-simulation?session_id=${tempSessionRef}` });
    }

    // 4. Map items to Stripe Line Items for real Stripe Checkout
    const lineItems = pendingOrder.items.map((item) => {
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

    // 5. Create Stripe Checkout Session
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

    // 6. Update Order in DB to bind the actual Stripe Session ID
    await Database.write((db) => {
      const order = db.orders.find((o) => o.sessionId === tempSessionRef);
      if (order) {
        order.sessionId = session.id;
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Session Creation Failed:", error);

    // Rollback stock reservation if we hit any error
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
