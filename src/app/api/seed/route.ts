import { NextResponse } from "next/server";
import { firestoreDb, saveCredentials } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Database } from "@/data/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const adminId = "u_admin_test";
    const adminUser = {
      id: adminId,
      name: "System Admin",
      email: "admin@college.edu",
      role: "admin",
      department: "IT",
      status: "active",
      createdAt: new Date().toISOString()
    };

    // Save to firestore users collection
    if (firestoreDb) {
      await setDoc(doc(firestoreDb, "users", adminId), adminUser);
    } else {
      await Database.write((db) => {
        if (!db.users) db.users = [];
        const idx = db.users.findIndex((u) => u.id === adminId);
        if (idx !== -1) {
          db.users[idx] = adminUser;
        } else {
          db.users.push(adminUser);
        }
      });
    }

    // Save password
    const hash = await bcrypt.hash("admin123", 10);
    await saveCredentials(adminId, { passwordHash: hash });

    return NextResponse.json({ success: true, message: "Admin seeded" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
