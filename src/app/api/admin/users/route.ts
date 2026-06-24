import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { verifyToken, getSessionUser } from "@/lib/auth";
import { getFirestoreCollection, getCredentials, firestoreDb, saveCredentials, deleteCredentials } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

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

    const users = await getFirestoreCollection("users");

    // Return all users for admin review (excluding password hashes and retrieving activation tokens from Firestore/fallback)
    const sanitizedUsers = await Promise.all(
      users.map(async ({ password_hash, activationToken, ...u }: any) => {
        if (u.status === "approved") {
          const creds = await getCredentials(u.id);
          return {
            ...u,
            activationToken: creds?.activationToken || null,
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
    if (!userId || !action || (action !== "approve" && action !== "reject" && action !== "suspend" && action !== "unsuspend" && action !== "revoke")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const userRef = doc(firestoreDb, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userSnap.data();

    if (action === "approve") {
      if (user.status !== "pending") {
        return NextResponse.json({ error: "User is not in pending status" }, { status: 400 });
      }

      const activationToken = `ACTIV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Save encrypted activation token in Firestore/fallback
      await saveCredentials(userId, { activationToken });

      await updateDoc(userRef, { status: "approved" });

      return NextResponse.json({
        success: true,
        message: "User approved successfully.",
        activationToken,
      });
    } else if (action === "reject") {
      // Delete user credentials document from Firestore/fallback
      await deleteCredentials(userId);
      await deleteDoc(userRef);

      return NextResponse.json({
        success: true,
        message: "User registration request rejected and deleted.",
      });
    } else if (action === "suspend") {
      await updateDoc(userRef, { status: "suspended" });
      return NextResponse.json({
        success: true,
        message: "User account suspended successfully.",
      });
    } else if (action === "unsuspend") {
      await updateDoc(userRef, { status: "active" });
      return NextResponse.json({
        success: true,
        message: "User account reactivated successfully.",
      });
    } else if (action === "revoke") {
      // Delete credentials from Firestore/fallback
      await deleteCredentials(userId);
      await updateDoc(userRef, { status: "pending" });
      return NextResponse.json({
        success: true,
        message: "User access revoked successfully.",
      });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error.code === "permission-denied") {
      return NextResponse.json({ 
        error: "Database permission denied. Please update your Firestore Security Rules to allow writes to the 'users' collection." 
      }, { status: 500 });
    }
    console.error("Admin Users PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
