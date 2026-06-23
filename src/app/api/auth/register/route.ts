import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";

export async function POST(req: NextRequest) {
  try {
    const { email, name, role, department, studentId } = await req.json();

    if (!email || !name || !role || !department) {
      return NextResponse.json(
        { error: "Email, name, role, and department are required." },
        { status: 400 }
      );
    }

    if (role !== "student" && role !== "staff" && role !== "admin") {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 }
      );
    }

    if (role === "student" && !studentId) {
      return NextResponse.json(
        { error: "Student ID is required for student accounts." },
        { status: 400 }
      );
    }

    const db = await Database.read();
    const existingUser = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const newUser = {
      id: `u_${role}_${Math.random().toString(36).substring(2, 9)}`,
      email: email.toLowerCase(),
      name,
      role,
      status: "pending" as const,
      department,
      studentId: role === "student" ? studentId : undefined,
      walletBalance: role === "student" ? 0 : undefined,
    };

    await Database.write((dbData) => {
      dbData.users.push(newUser);
    });

    return NextResponse.json({
      success: true,
      message: "Registration successful. Your account is pending admin approval.",
    });
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
