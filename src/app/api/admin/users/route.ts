import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/data/db";
import { verifyToken } from "@/lib/auth";

// Middleware/Helper to verify Admin role
async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  const user = await verifyToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await Database.read();
    // Return all users for admin review (excluding password hashes for security)
    const sanitizedUsers = db.users.map(({ password_hash, ...u }) => u);
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
    if (!userId || !action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const db = await Database.read();
    const userIndex = db.users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = db.users[userIndex];

    if (action === "approve") {
      if (user.status !== "pending") {
        return NextResponse.json({ error: "User is not in pending status" }, { status: 400 });
      }

      const activationToken = `ACTIV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      await Database.write((dbData) => {
        const u = dbData.users.find((x) => x.id === userId);
        if (u) {
          u.status = "approved";
          u.activationToken = activationToken;
        }
      });

      return NextResponse.json({
        success: true,
        message: "User approved successfully.",
        activationToken,
      });
    } else if (action === "reject") {
      await Database.write((dbData) => {
        dbData.users = dbData.users.filter((x) => x.id !== userId);
      });

      return NextResponse.json({
        success: true,
        message: "User registration request rejected and deleted.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin Users PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
