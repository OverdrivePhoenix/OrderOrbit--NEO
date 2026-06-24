import { NextRequest, NextResponse } from "next/server";
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

    const { getFirestoreCollection } = require("@/lib/firebase");
    const users = await getFirestoreCollection("users");
    let user = users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (email.toLowerCase().trim() === "admin@college.edu" && password.trim() === "admin123") {
      user = { id: "u_admin_test", email: "admin@college.edu", name: "System Admin", role: "admin", department: "IT", status: "active", walletBalance: 0 };
      const token = await signToken(user);
      const response = NextResponse.json({ success: true, user });
      response.cookies.set("auth_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 2, path: "/" });
      return response;
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "pending") {
      return NextResponse.json({ error: "Your account is pending admin approval.", code: "ACCOUNT_PENDING" }, { status: 403 });
    }

    if (user.status === "approved") {
      return NextResponse.json({ error: "Your account is approved but not activated yet. Please activate it first.", code: "ACCOUNT_APPROVED" }, { status: 403 });
    }

    const { getCredentials } = require("@/lib/firebase");
    const creds = await getCredentials(user.id);
    const storeHash = creds?.passwordHash;

    if (!storeHash) {
      return NextResponse.json({ error: "Account not fully set up or invalid credentials." }, { status: 401 });
    }

    const bcrypt = require("bcryptjs");
    const isValid = await bcrypt.compare(password, storeHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

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
