import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";

export async function POST(req: NextRequest) {
  try {
    const { email, activationToken, password } = await req.json();

    if (!email || !activationToken || !password) {
      return NextResponse.json(
        { error: "Email, activation token, and password are required." },
        { status: 400 }
      );
    }

    const db = await Database.read();
    const userIndex = db.users.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (userIndex === -1) {
      return NextResponse.json(
        { error: "No user found with the given email address." },
        { status: 404 }
      );
    }

    const user = db.users[userIndex];

    if (user.status === "active") {
      return NextResponse.json(
        { error: "Account is already active. Please log in." },
        { status: 400 }
      );
    }

    if (user.status !== "approved") {
      return NextResponse.json(
        { error: "Account is not in approved state. Please wait for admin approval." },
        { status: 400 }
      );
    }

    // Fetch and decrypt activation token from Firestore/fallback
    const { getCredentials, saveCredentials } = require("@/lib/firebase");
    const credentials = await getCredentials(user.id);
    const storeToken = credentials?.activationToken;

    if (!storeToken || storeToken.toUpperCase() !== activationToken.trim().toUpperCase()) {
      return NextResponse.json(
        { error: "Invalid activation token." },
        { status: 400 }
      );
    }

    // Hash the password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save encrypted credentials to Firestore/fallback
    await saveCredentials(user.id, {
      passwordHash: hashedPassword,
      activationToken: null,
    });

    await Database.write((dbData) => {
      const u = dbData.users.find((x) => x.id === user.id);
      if (u) {
        // Remove plain text credential fields if they exist in local DB
        delete u.password_hash;
        delete u.activationToken;
        u.status = "active";
      }
    });

    return NextResponse.json({
      success: true,
      message: "Account activated successfully. You can now log in.",
    });
  } catch (error: any) {
    console.error("Activation API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
