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

/** Send the activation token email after admin approval */
export async function sendActivationEmail(
  to: string,
  name: string,
  activationToken: string
): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error("Email service is not configured. Please contact the administrator.");
  }

  const activateUrl = "https://order-orbit-neo.vercel.app/activate";

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
            <div style="width:64px;height:64px;background:rgba(34,197,94,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;border:2px solid rgba(34,197,94,0.4);">
              <span style="font-size:32px;">✅</span>
            </div>
            <h2 style="margin:0 0 8px;color:#f0f6fc;font-size:20px;font-weight:700;">Account Approved!</h2>
            <p style="margin:0 0 24px;color:#8b949e;font-size:14px;line-height:1.6;">
              Hi <strong style="color:#f0f6fc;">${name}</strong>, your OrderOrbit account has been approved by the administrator.
              Use the activation token below to set up your password and activate your account.
            </p>

            <p style="margin:0 0 8px;color:#8b949e;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Your Activation Token</p>
            <div style="background:#161b22;border:2px solid rgba(255,107,53,0.4);border-radius:12px;padding:20px 24px;margin:0 0 24px;">
              <span style="font-size:28px;font-weight:900;letter-spacing:0.15em;color:#ff6b35;font-family:'Courier New',monospace;">${activationToken}</span>
            </div>

            <a href="${activateUrl}" style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#e85a2a);color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
              Activate My Account →
            </a>

            <p style="margin:24px 0 0;color:#8b949e;font-size:12px;line-height:1.6;">
              Or go to <a href="${activateUrl}" style="color:#ff6b35;">${activateUrl}</a> and enter the token above.<br/>
              <strong style="color:#f0f6fc;">Keep this token safe — you will need it only once.</strong>
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid rgba(255,255,255,0.06);"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#6e7681;font-size:11px;line-height:1.6;">
              If you did not create an account on OrderOrbit, you can safely ignore this email.<br/>
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
    subject: `✅ Your OrderOrbit account has been approved — Activation Token: ${activationToken}`,
    text: `Hi ${name},\n\nYour OrderOrbit account has been approved!\n\nYour Activation Token: ${activationToken}\n\nGo to ${activateUrl} and enter this token to set your password and activate your account.\n\nKeep this token safe — you will need it only once.\n\n© 2026 OrderOrbit`,
    html,
  });
}

/** Send OTP verification email */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
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
        <tr>
          <td style="background:linear-gradient(135deg,#ff6b35,#e85a2a);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.03em;">🚀 OrderOrbit</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">College Canteen Pre-Order System</p>
          </td>
        </tr>
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
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid rgba(255,255,255,0.06);"></div></td></tr>
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
