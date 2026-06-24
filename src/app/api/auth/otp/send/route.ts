import { NextRequest, NextResponse } from "next/server";
import { saveOtp } from "@/lib/firebase";
import { Database } from "@/data/db";
import { normalizeEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(trimmedEmail);

    // Check if the user already exists in the database (checking normalized emails to catch Gmail aliases)
    const db = await Database.read();
    const existingUser = db.users.find(
      (u) => normalizeEmail(u.email) === normalizedEmail
    );

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save the OTP to Firestore or local memory map
    await saveOtp(trimmedEmail, otp);

    // Print the OTP in server console logs (visible on terminal or Vercel logs)
    console.log(`\n==========================================\n[OTP VERIFICATION] Code for ${trimmedEmail} is: ${otp}\n==========================================\n`);

    // Only return the OTP in the API response for college.edu emails to facilitate easy demo testing.
    // For gmail.com and other public domains, the OTP is hidden to prevent fake email registration.
    const isCollegeEmail = trimmedEmail.endsWith("@college.edu");

    return NextResponse.json({
      success: true,
      message: "Verification code generated and sent.",
      ...(isCollegeEmail ? { debugOtp: otp } : {}),
    });
  } catch (error: any) {
    console.error("OTP Send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
