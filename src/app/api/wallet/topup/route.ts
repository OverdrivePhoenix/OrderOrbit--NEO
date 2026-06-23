import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await req.json(); // amount in paise
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid topup amount" }, { status: 400 });
    }

    const newBalance = await Database.topupWallet(user.id, amount);

    return NextResponse.json({
      success: true,
      walletBalance: newBalance,
    });
  } catch (error: any) {
    console.error("Wallet topup API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
