import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!sig || !webhookSecret) {
      throw new Error("Missing signature or webhook secret");
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Signature verification failed: ${err.message}`);
    // If it's a test environment and signature fails, let's have a fallback logic for development
    // only if the webhook secret is set to placeholder!
    if (process.env.STRIPE_WEBHOOK_SECRET === "whsec_placeholder_key") {
      console.warn("Dev mode webhook bypass: Signature check bypassed for placeholder keys.");
      // Parse event without verification for local debugging
      try {
        event = JSON.parse(body);
      } catch (parseErr) {
        return NextResponse.json({ error: `Parsing error: ${parseErr}` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
  }

  try {
    const session = event.data.object as any;

    switch (event.type) {
      case "checkout.session.completed":
        console.log(`Stripe Payment Success for session: ${session.id}`);
        // Transition order status to "Pending" and generate canteen token
        const confirmedOrder = await Database.confirmOrder(session.id);
        if (confirmedOrder) {
          console.log(`Confirmed Order: ${confirmedOrder.token}`);
        }
        break;

      case "checkout.session.expired":
        console.log(`Stripe Session Expired: ${session.id}. Releasing stock.`);
        // Release reserved stock back to active menu list
        await Database.releaseReservedStock(session.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
