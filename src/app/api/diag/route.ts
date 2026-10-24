import { NextResponse } from "next/server";
import { adminGetCollection } from "@/lib/firebase-admin";
import { getFirestoreCollection } from "@/lib/firebase";

/**
 * Temporary diagnostic endpoint to surface actual server errors.
 * GET /api/diag → returns Firestore connection test result.
 * DELETE AFTER DEBUGGING.
 */
export async function GET() {
  const results: Record<string, any> = {};

  try {
    const adminMenu = await adminGetCollection("menu");
    results.adminSdk = { ok: true, menuCount: adminMenu.length };
  } catch (e: any) {
    results.adminSdk = { ok: false, error: e.message };
  }

  try {
    const clientMenu = await getFirestoreCollection("menu");
    results.clientSdk = { ok: true, menuCount: clientMenu.length };
  } catch (e: any) {
    results.clientSdk = { ok: false, error: e.message };
  }

  const env = {
    NODE_ENV: process.env.NODE_ENV,
    hasAdminEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    hasAdminKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID || !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasClientApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    hasClientProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  return NextResponse.json({ results, env });
}
