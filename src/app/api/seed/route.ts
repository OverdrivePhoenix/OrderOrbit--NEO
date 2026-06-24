import { NextResponse } from "next/server";
import { firestoreDb, saveCredentials } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
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
    await setDoc(doc(firestoreDb, "users", adminId), adminUser);

    // Save password
    const hash = await bcrypt.hash("admin123", 10);
    await saveCredentials(adminId, { passwordHash: hash });

    return NextResponse.json({ success: true, message: "Admin seeded" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
