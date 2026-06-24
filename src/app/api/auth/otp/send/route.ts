import { NextRequest, NextResponse } from "next/server";
import { saveOtp } from "@/lib/firebase";
import nodemailer from "nodemailer";

// Build the Gmail SMTP transporter using env credentials
function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;

  const fromName = "OrderOrbit";
  const from = `"${fromName}" <${process.env.GMAIL_USER}>`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#05080f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05080f;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0d1117;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;max-width:480px;width:100%;">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#ff6b35,#e85a2a);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.03em;">
              🚀 OrderOrbit
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">College Canteen Pre-Order System</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;text-align:center;">
            <p style="margin:0 0 8px;color:#8b949e;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Your verification code</p>
            <div style="background:#161b22;border:2px solid rgba(255,107,53,0.4);border-radius:12px;padding:24px;margin:16px 0;">
              <span style="font-size:42px;font-weight:900;letter-spacing:0.2em;color:#ff6b35;font-family:'Courier New',monospace;">${otp}</span>
            </div>
            <p style="margin:16px 0 0;color:#8b949e;font-size:13px;line-height:1.6;">
              Enter this code on the registration page to verify your email.<br/>
              <strong style="color:#f0f6fc;">This code expires in 5 minutes.</strong>
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid rgba(255,255,255,0.06);"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#6e7681;font-size:11px;line-height:1.6;">
              If you did not request this, you can safely ignore this email.<br/>
              © 2026 OrderOrbit · B.Tech S4 Engineering Project
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `${otp} is your OrderOrbit verification code`,
      text: `Your OrderOrbit verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[OTP] Gmail send failed:", err);
    return false;
  }
}

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

    // Save to Firestore (with in-memory fallback)
    await saveOtp(key, otp);

    // Always log to server console (visible in Vercel Function Logs)
    console.log(`\n==========================================\n[OTP] Code for ${key}: ${otp}\n==========================================\n`);

    // Try to send via Gmail SMTP
    const emailSent = await sendOtpEmail(key, otp);

    if (emailSent) {
      // Email delivered — don't expose OTP in response
      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${key}. Check your inbox (and spam folder).`,
      });
    }

    // Gmail not configured — fall back to on-screen display
    console.warn("[OTP] GMAIL_USER / GMAIL_APP_PASSWORD not set. Returning code in response for demo.");
    return NextResponse.json({
      success: true,
      message: "Email service not configured. Use the code shown below.",
      debugOtp: otp,
    });

  } catch (error: any) {
    console.error("OTP Send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
