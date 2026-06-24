import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { adminGetCollection } from "@/lib/firebase-admin";
import { getCredentials } from "@/lib/firebase";
import bcrypt from "bcryptjs";

// Hardcoded demo accounts — work even when Firestore has no data yet
const DEMO_ACCOUNTS: Record<string, { password: string; user: any }> = {
  "admin@college.edu": {
    password: "admin123",
    user: {
      id: "u_admin_test",
      email: "admin@college.edu",
      name: "System Admin",
      role: "admin",
      department: "IT",
      status: "active",
      walletBalance: 0,
    },
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

    // Demo/fallback accounts — always work
    const demoAccount = DEMO_ACCOUNTS[emailKey];
    if (demoAccount) {
      if (password !== demoAccount.password) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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

    // Real registered users — look up via Admin SDK (bypasses Firestore rules)
    const users = await adminGetCollection("users");
    const user = users.find((u: any) => u.email.toLowerCase() === emailKey);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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
    if (!creds?.passwordHash) {
      return NextResponse.json({ error: "Account credentials not found. Please contact admin." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, creds.passwordHash);
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
      maxAge: 60 * 60 * 2,
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
