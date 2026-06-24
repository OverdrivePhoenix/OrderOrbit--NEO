import { NextRequest, NextResponse } from "next/server";
import { getFirestoreCollection, firestoreDb, saveCredentials, getCredentials } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, activationToken, password } = await req.json();

    if (!email || !activationToken || !password) {
      return NextResponse.json(
        { error: "Email, activation token, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (!firestoreDb) {
      return NextResponse.json(
        { error: "Database is unavailable. Please contact the administrator." },
        { status: 500 }
      );
    }

    // Find the user by email using safe collection helper
    const users = await getFirestoreCollection("users");
    const user = users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email address." },
        { status: 404 }
      );
    }

    if (user.status === "active") {
      return NextResponse.json(
        { error: "Account is already active. Please log in." },
        { status: 400 }
      );
    }

    if (user.status === "pending") {
      return NextResponse.json(
        { error: "Your account is still pending admin approval." },
        { status: 400 }
      );
    }

    if (user.status !== "approved") {
      return NextResponse.json(
        { error: "Account is not in an approved state." },
        { status: 400 }
      );
    }

    const inputToken = activationToken.trim().toUpperCase();

    // Check 1: token stored directly on the user document (most reliable, set during approval)
    const tokenOnUser: string | undefined = user.activationToken;

    // Check 2: token in the encrypted credentials collection (fallback)
    let tokenInCreds: string | null = null;
    try {
      const credentials = await getCredentials(user.id);
      tokenInCreds = credentials?.activationToken || null;
    } catch (e) {
      console.warn("Could not read credentials collection:", e);
    }

    const validToken =
      (tokenOnUser && tokenOnUser.toUpperCase() === inputToken) ||
      (tokenInCreds && tokenInCreds.toUpperCase() === inputToken);

    if (!validToken) {
      console.error(
        `Activation failed for ${email}. Input: "${inputToken}", OnUser: "${tokenOnUser}", InCreds: "${tokenInCreds}"`
      );
      return NextResponse.json(
        { error: "Invalid activation token. Check your email and try again." },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save password hash and clear activation token
    try {
      await saveCredentials(user.id, {
        passwordHash: hashedPassword,
        activationToken: null,
      });
    } catch (credErr) {
      console.warn("Could not save to credentials collection:", credErr);
    }

    // Mark user as active and remove token from user doc
    await updateDoc(doc(firestoreDb, "users", user.id), {
      status: "active",
      activationToken: null,
    });

    return NextResponse.json({
      success: true,
      message: "Account activated successfully! You can now log in.",
    });
  } catch (error: any) {
    console.error("Activation API error:", error);
    if (error.code === "permission-denied") {
      return NextResponse.json(
        { error: "Database permission denied. Please update your Firestore Security Rules." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
