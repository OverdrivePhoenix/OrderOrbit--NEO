import { NextRequest, NextResponse } from "next/server";

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

    const { getFirestoreCollection, firestoreDb, saveCredentials, getCredentials } = require("@/lib/firebase");
    const { doc, updateDoc, getDoc } = require("firebase/firestore");

    // Find the user by email
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

    // Strategy 1: check the activationToken stored directly on the user document
    const userRef = doc(firestoreDb, "users", user.id);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    const tokenOnUser = userData?.activationToken;

    // Strategy 2: check the credentials collection (encrypted)
    const credentials = await getCredentials(user.id);
    const tokenInCreds = credentials?.activationToken;

    const inputToken = activationToken.trim().toUpperCase();
    const validToken =
      (tokenOnUser && tokenOnUser.toUpperCase() === inputToken) ||
      (tokenInCreds && tokenInCreds.toUpperCase() === inputToken);

    if (!validToken) {
      // Helpful debug info in server logs
      console.error(`Activation failed for ${email}. Input: "${inputToken}", OnUser: "${tokenOnUser}", InCreds: "${tokenInCreds}"`);
      return NextResponse.json(
        { error: "Invalid activation token. Check your email and try again, or contact the admin." },
        { status: 400 }
      );
    }

    // Hash the new password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save password hash and clear the activation token
    await saveCredentials(user.id, {
      passwordHash: hashedPassword,
      activationToken: null,
    });

    // Mark user as active and clear activationToken from user doc
    await updateDoc(userRef, {
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
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
