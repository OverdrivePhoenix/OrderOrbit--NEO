import { NextRequest, NextResponse } from "next/server";
import { saveCredentials } from "@/lib/firebase";
import { adminGetCollection, adminUpdateDoc } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";

/**
 * Temporary one-time endpoint to re-hash a user password using the live server's
 * encryption key. Protected by a secret token passed as a query param.
 * Usage: GET /api/reset-my-password?token=RESET_SECRET&email=jkbsace@gmail.com&password=newpass
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const password = searchParams.get("password");

  // Very basic protection — env var or hardcoded
  const RESET_TOKEN =
    process.env.RESET_SECRET ||
    process.env.JWT_SECRET ||
    "default-super-secret-key-that-is-very-long";

  if (token !== RESET_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!email || !password || password.length < 4) {
    return NextResponse.json({ error: "Missing or short password/email" }, { status: 400 });
  }

  try {
    // Find user by email
    const users = await adminGetCollection("users");
    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
    }

    // Re-hash with current server key
    const hash = await bcrypt.hash(password, 10);
    await saveCredentials(user.id, { passwordHash: hash });

    // Also ensure user is active
    if (user.status !== "active") {
      await adminUpdateDoc("users", user.id, { status: "active" });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset for ${email} (id: ${user.id}). Status set to active.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
