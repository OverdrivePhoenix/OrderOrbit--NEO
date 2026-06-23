import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = await Database.read();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status === "pending") {
      return NextResponse.json(
        { error: "Your account is pending admin approval.", code: "ACCOUNT_PENDING" },
        { status: 403 }
      );
    }

    if (user.status === "approved") {
      return NextResponse.json(
        { error: "Your account is approved but not activated yet. Please activate it first.", code: "ACCOUNT_APPROVED" },
        { status: 403 }
      );
    }

    // Verify password using bcryptjs by fetching from Firestore/fallback
    const prebuiltEmails = ["student@college.edu", "staff@college.edu", "admin@college.edu"];
    let passwordHash: string | null = null;

    if (prebuiltEmails.includes(user.email.toLowerCase())) {
      passwordHash = "$2b$10$4cvpfhzXJ/nO1zn4iMSdO.QJrHUfTufML7cxoW4EEtli1U5T0RYla"; // bcrypt of "password"
    } else {
      const { getCredentials } = require("@/lib/firebase");
      const credentials = await getCredentials(user.id);
      passwordHash = credentials?.passwordHash;
    }

    const bcrypt = require("bcryptjs");
    const isPasswordCorrect = (passwordHash && passwordHash.startsWith("$2"))
      ? await bcrypt.compare(password, passwordHash)
      : false;

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signToken(user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        walletBalance: user.walletBalance || 0,
      },
    });

    // Set JWT in HTTP-only cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete("auth_token");
  return response;
}
