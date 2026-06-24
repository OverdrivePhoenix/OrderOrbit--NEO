import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  adminGetCollection,
  adminGetDoc,
  adminSetDoc,
  adminUpdateDoc,
  adminDeleteDoc,
} from "@/lib/firebase-admin";
import { getCredentials, saveCredentials, deleteCredentials } from "@/lib/firebase";
import { sendActivationEmail } from "@/lib/email";

async function checkAdmin(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await adminGetCollection("users");

    // Attach activation tokens for approved users
    const sanitizedUsers = await Promise.all(
      users.map(async ({ password_hash, ...u }: any) => {
        if (u.status === "approved") {
          const creds = await getCredentials(u.id);
          return {
            ...u,
            activationToken: u.activationToken || creds?.activationToken || null,
          };
        }
        return u;
      })
    );

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error: any) {
    console.error("Admin Users GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action } = await req.json();
    if (
      !userId ||
      !action ||
      !["approve", "reject", "suspend", "unsuspend", "revoke"].includes(action)
    ) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const user = await adminGetDoc("users", userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "approve") {
      if (user.status !== "pending") {
        return NextResponse.json({ error: "User is not in pending status" }, { status: 400 });
      }

      const activationToken = `ACTIV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Save encrypted token in credentials collection
      try {
        await saveCredentials(userId, { activationToken });
      } catch (e) {
        console.warn("Could not save to credentials collection:", e);
      }

      // Store token directly on user doc as reliable fallback + update status
      await adminUpdateDoc("users", userId, {
        status: "approved",
        activationToken,
      });

      // Email the activation token
      let emailSent = false;
      let emailError = "";
      try {
        await sendActivationEmail(user.email, user.name, activationToken);
        emailSent = true;
      } catch (emailErr: any) {
        emailError = emailErr.message || "Failed to send email";
        console.error("Failed to send activation email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: emailSent
          ? `User approved. Activation email sent to ${user.email}.`
          : `User approved. Email failed (${emailError}). Token: ${activationToken}`,
        activationToken,
        emailSent,
      });
    }

    if (action === "reject") {
      await deleteCredentials(userId);
      await adminDeleteDoc("users", userId);
      return NextResponse.json({ success: true, message: "User registration rejected and deleted." });
    }

    if (action === "suspend") {
      await adminUpdateDoc("users", userId, { status: "suspended" });
      return NextResponse.json({ success: true, message: "User account suspended." });
    }

    if (action === "unsuspend") {
      await adminUpdateDoc("users", userId, { status: "active" });
      return NextResponse.json({ success: true, message: "User account reactivated." });
    }

    if (action === "revoke") {
      await deleteCredentials(userId);
      await adminUpdateDoc("users", userId, { status: "pending" });
      return NextResponse.json({ success: true, message: "User access revoked." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin Users PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
