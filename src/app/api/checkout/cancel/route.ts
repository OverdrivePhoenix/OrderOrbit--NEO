import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser, verifyOrders, signOrders } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Call releaseReservedStock in DB (restores stock levels)
    await Database.releaseReservedStock(sessionId);

    // Update browser cookie for stateless Vercel environments
    const ordersToken = req.cookies.get("orbit_orders")?.value;
    const cookieOrders = ordersToken ? await verifyOrders(ordersToken) : [];
    // Remove the cancelled order from active cookies list
    const updatedCookieOrders = cookieOrders.filter((o) => o.sessionId !== sessionId);
    const newToken = await signOrders(updatedCookieOrders);

    const response = NextResponse.json({ success: true, message: "Reserved stock released successfully" });
    response.cookies.set("orbit_orders", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Order cancellation API error:", error);
    return NextResponse.json({ error: "Failed to process cancellation" }, { status: 500 });
  }
}
