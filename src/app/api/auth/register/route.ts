import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { normalizeEmail } from "@/lib/auth";
import { jwtVerify } from "jose";
import crypto from "crypto";
import { getFirestoreCollection, firestoreDb, sanitizeForFirestore } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { email, name, role, department, studentId, otp, otpToken } = await req.json();

    if (!email || !name || !role || !department || !otp) {
      return NextResponse.json(
        { error: "Email, name, role, department, and verification code are required." },
        { status: 400 }
      );
    }

    if (!otpToken) {
      return NextResponse.json(
        { error: "Verification session expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Stateless OTP verification using JWT
    try {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "fallback");
      const { payload } = await jwtVerify(otpToken, secretKey);
      
      if (payload.email !== email.toLowerCase().trim()) {
        throw new Error("Email mismatch");
      }
      
      const expectedHash = crypto.createHash("sha256").update(otp + (process.env.JWT_SECRET || "fallback")).digest("hex");
      if (payload.otpHash !== expectedHash) {
         throw new Error("Invalid code");
      }
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
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

    const users = await getFirestoreCollection("users");
    const normalizedNewEmail = normalizeEmail(email);
    const existingUser = users.find(
      (u: any) => normalizeEmail(u.email) === normalizedNewEmail
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

    try {
      await setDoc(doc(firestoreDb, "users", newUser.id), sanitizeForFirestore(newUser));
    } catch (dbError: any) {
      if (dbError.code === "permission-denied") {
        return NextResponse.json({ 
          error: "Database permission denied. Please update your Firestore Security Rules to allow writes to the 'users' collection." 
        }, { status: 500 });
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful. Your account is pending admin approval.",
    });
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
