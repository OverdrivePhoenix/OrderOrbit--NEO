import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY environment variable is not set!");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-25-preview" as any, // Use standard or ignore version override to let SDK handle defaults
  typescript: true,
});
