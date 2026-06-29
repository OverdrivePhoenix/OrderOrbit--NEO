import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firestoreDb } = require("@/lib/firebase");
    let currentUser: any = null;

    if (firestoreDb) {
      const { doc, getDoc } = require("firebase/firestore");
      const userSnap = await getDoc(doc(firestoreDb, "users", user.id));
      currentUser = userSnap.exists() ? userSnap.data() : null;
    } else {
      const db = await Database.read();
      currentUser = db.users?.find((u) => u.id === user.id) || null;
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      walletBalance: currentUser.walletBalance || 0,
    });
  } catch (error: any) {
    console.error("Failed to fetch wallet balance", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
