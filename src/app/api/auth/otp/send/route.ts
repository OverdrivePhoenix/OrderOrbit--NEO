import { NextRequest, NextResponse } from "next/server";
import { saveOtp } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const key = email.toLowerCase().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(key)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to Firestore (with in-memory fallback for same-instance requests)
    await saveOtp(key, otp);

    // Always log to server console (visible in Vercel Function Logs)
    console.log(`\n==========================================\n[OTP] Code for ${key}: ${otp}\n==========================================\n`);

    // Return the OTP in the response for all emails.
    // This project has no live SMTP server — the on-screen debug code IS the delivery mechanism.
    return NextResponse.json({
      success: true,
      message: "Verification code generated. Enter the code shown below.",
      debugOtp: otp,
    });
  } catch (error: any) {
    console.error("OTP Send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
