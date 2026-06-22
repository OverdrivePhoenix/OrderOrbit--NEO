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

    // Call releaseReservedStock in DB (restores stock levels)
    await Database.releaseReservedStock(sessionId);

    return NextResponse.json({ success: true, message: "Reserved stock released successfully" });
  } catch (error: any) {
    console.error("Order cancellation API error:", error);
    return NextResponse.json({ error: "Failed to process cancellation" }, { status: 500 });
  }
}
