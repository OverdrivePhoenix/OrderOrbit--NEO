import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

// Hardcoded fallback admin account that works even when Firestore is unreachable
const FALLBACK_ADMIN = {
  id: "u_admin_test",
  email: "admin@college.edu",
  name: "System Admin",
  role: "admin" as const,
  department: "IT",
  status: "active",
  walletBalance: 0,
};

// Hardcoded demo accounts with their passwords (for when Firestore is blocked)
const DEMO_ACCOUNTS: Record<string, { password: string; user: any }> = {
  "admin@college.edu": {
    password: "admin123",
    user: FALLBACK_ADMIN,
  },
  "student@college.edu": {
    password: "password",
    user: {
      id: "u_student_demo",
      email: "student@college.edu",
      name: "Demo Student",
      role: "student",
      department: "Computer Science",
      status: "active",
      walletBalance: 0,
    },
  },
  "staff@college.edu": {
    password: "password",
    user: {
      id: "u_staff_demo",
      email: "staff@college.edu",
      name: "Demo Staff",
      role: "staff",
      department: "Main Canteen",
      status: "active",
      walletBalance: 0,
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase().trim();

    // Check demo/fallback accounts first — works even when Firestore is down
    const demoAccount = DEMO_ACCOUNTS[emailKey];
    if (demoAccount) {
      if (password !== demoAccount.password) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
      const token = await signToken(demoAccount.user);
      const response = NextResponse.json({ success: true, user: demoAccount.user });
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 2,
        path: "/",
      });
      return response;
    }

    // For real registered users — look them up in Firestore
    const { getFirestoreCollection, getCredentials } = require("@/lib/firebase");
    const users = await getFirestoreCollection("users");
    const user = users.find(
      (u: any) => u.email.toLowerCase() === emailKey
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

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact admin.", code: "ACCOUNT_SUSPENDED" },
        { status: 403 }
      );
    }

    const creds = await getCredentials(user.id);
    const storeHash = creds?.passwordHash;

    if (!storeHash) {
      return NextResponse.json(
        { error: "Account credentials not found. Please contact admin." },
        { status: 401 }
      );
    }

    const bcrypt = require("bcryptjs");
    const isValid = await bcrypt.compare(password, storeHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
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
      maxAge: 60 * 60 * 2,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete("auth_token");
  return response;
}
