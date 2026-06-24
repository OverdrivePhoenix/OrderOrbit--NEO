import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SignJWT } from "jose";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const key = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(key)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a stateless JWT token with hashed OTP to avoid Vercel Serverless memory issues
    const otpHash = crypto.createHash("sha256").update(otp + (process.env.JWT_SECRET || "fallback")).digest("hex");
    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "fallback");
    
    const token = await new SignJWT({ email: key, otpHash })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secretKey);

    // Log to server only — never exposed in API response
    console.log(`[OTP] ${key} → ${otp}`);

    // Send via Gmail — throws if not configured or on SMTP failure
    await sendOtpEmail(key, otp);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${key}. Check your inbox.`,
      otpToken: token,
    });

  } catch (error: any) {
    const raw: string = error.message || "";
    console.error("OTP Send error:", raw);

    // Map known SMTP / config errors to friendly messages
    let friendly = "Failed to send verification code. Please try again.";

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      friendly = "Email service is not configured. Contact the administrator.";
    } else if (raw.includes("535") || raw.includes("Username and Password not accepted")) {
      friendly = "Email login failed. The Gmail App Password is incorrect — check Vercel environment variables.";
    } else if (raw.includes("534") || raw.includes("Application-specific password")) {
      friendly = "Gmail requires an App Password (not your regular password). Update GMAIL_APP_PASSWORD in Vercel settings.";
    } else if (raw.includes("ECONNREFUSED") || raw.includes("ETIMEDOUT") || raw.includes("421")) {
      friendly = "Could not reach Gmail servers. Please try again in a moment.";
    } else if (raw.includes("not configured")) {
      friendly = raw; // already user-friendly
    }

    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
