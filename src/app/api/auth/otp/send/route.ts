import { NextRequest, NextResponse } from "next/server";
import { saveOtp } from "@/lib/firebase";
import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("Email service is not configured. Please contact the administrator.");
  }

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

  await transporter.sendMail({
    from: `"OrderOrbit" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${otp} — your OrderOrbit verification code`,
    text: `Your OrderOrbit verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
    html,
  });
}

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

    // Persist to Firestore (+ in-memory fallback)
    await saveOtp(key, otp);

    // Log to server only — never exposed in API response
    console.log(`[OTP] ${key} → ${otp}`);

    // Send via Gmail — throws if not configured or on SMTP failure
    await sendOtpEmail(key, otp);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${key}. Check your inbox.`,
    });

  } catch (error: any) {
    console.error("OTP Send error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
