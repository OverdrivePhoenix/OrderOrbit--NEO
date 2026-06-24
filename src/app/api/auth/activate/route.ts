import { NextRequest, NextResponse } from "next/server";
import { adminGetCollection, adminSetDoc } from "@/lib/firebase-admin";
import { getCredentials, saveCredentials } from "@/lib/firebase";
import { normalizeEmail } from "@/lib/auth";
import { jwtVerify } from "jose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, activationToken, password } = await req.json();

    if (!email || !activationToken || !password) {
      return NextResponse.json(
        { error: "Email, activation token, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Find user via Admin SDK — no Security Rules blocking
    const { adminGetDoc, adminUpdateDoc } = require("@/lib/firebase-admin");
    const users = await adminGetCollection("users");
    const user = users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      return NextResponse.json({ error: "No account found with that email address." }, { status: 404 });
    }

    if (user.status === "active") {
      return NextResponse.json({ error: "Account is already active. Please log in." }, { status: 400 });
    }
    if (user.status === "pending") {
      return NextResponse.json({ error: "Your account is still pending admin approval." }, { status: 400 });
    }
    if (user.status !== "approved") {
      return NextResponse.json({ error: "Account is not in an approved state." }, { status: 400 });
    }

    const inputToken = activationToken.trim().toUpperCase();

    // Check token stored on user doc (set by admin approve)
    const tokenOnUser: string | undefined = user.activationToken;

    // Check encrypted token in credentials collection
    let tokenInCreds: string | null = null;
    try {
      const credentials = await getCredentials(user.id);
      tokenInCreds = credentials?.activationToken || null;
    } catch (e) {
      console.warn("Could not read credentials collection:", e);
    }

    const validToken =
      (tokenOnUser && tokenOnUser.toUpperCase() === inputToken) ||
      (tokenInCreds && tokenInCreds.toUpperCase() === inputToken);

    if (!validToken) {
      console.error(`Activation failed for ${email}. Input: "${inputToken}", OnUser: "${tokenOnUser}", InCreds: "${tokenInCreds}"`);
      return NextResponse.json(
        { error: "Invalid activation token. Check your email and try again." },
        { status: 400 }
      );
    }

    // Hash password and save
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await saveCredentials(user.id, { passwordHash: hashedPassword, activationToken: null });
    } catch (e) {
      console.warn("Could not save credentials:", e);
    }

    // Mark user active via Admin SDK
    await adminUpdateDoc("users", user.id, { status: "active", activationToken: null });

    return NextResponse.json({
      success: true,
      message: "Account activated successfully! You can now log in.",
    });
  } catch (error: any) {
    console.error("Activation API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
