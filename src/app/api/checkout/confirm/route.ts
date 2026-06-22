import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

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

    // Call confirmOrder in DB (which updates state and returns order details)
    const order = await Database.confirmOrder(sessionId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Order confirmation API error:", error);
    return NextResponse.json({ error: "Failed to confirm order" }, { status: 500 });
  }
}
